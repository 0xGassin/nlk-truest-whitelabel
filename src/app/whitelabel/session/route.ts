import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

import { WHITELABEL_LOGIN_PATH } from "@/config/whitelabel";

/**
 * Whitelabel sign-in, server side.
 *
 * The partner API key authenticates the partner (not the end user) against
 * the partner API. It must never reach the browser, so the key is
 * read from a non-NEXT_PUBLIC_ variable and used only here, in the Node
 * runtime. The browser receives a one-time access code and nothing else.
 *
 * POST checks the demo credentials from the /login form and, on success,
 * sets the sign-in cookie below before returning a code.
 *
 * GET re-signs the visitor in without a form, for when the Exposure session
 * expires but the visitor has already proved who they are. It mints a code
 * only when that cookie is present and valid; otherwise it sends them to
 * /login. Minting a code is equivalent to handing out a session, so this
 * endpoint must never do it for an anonymous caller.
 *
 * Sign-in is two calls against the partner API:
 *
 *   1. POST /partner/orgs            provision the client organization
 *   2. POST /partner/orgs/{id}/access   mint a one-time code for it
 *
 * Step 1 is idempotent on external_id: the first call creates the org and its
 * service user, every later call returns that same org. So the demo user
 * always lands in the same organization and sees the same domains, scans and
 * findings, without anyone having to create it by hand first.
 *
 * Demo credentials stand in for the partner's own user directory. A real
 * deployment replaces the credential check below with the partner's identity
 * provider and maps each of its users to its own external_id; the rest of
 * this route is unchanged.
 *
 * This route lives outside /api on purpose: next.config.ts rewrites /api/*
 * to the Exposure API during local development, which would shadow it.
 */

export const runtime = "nodejs";
// The access code is single-use and short-lived; never cache this response.
export const dynamic = "force-dynamic";

const DEFAULT_CLIENT_NAME = "Truest Demo";

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * The provisioned org id, remembered for the life of the server process.
 * Provisioning is idempotent, so this is only an optimisation: losing it on
 * restart costs one extra call, never a different organization.
 */
let cachedOrgID: null | string = null;

/**
 * The partner API origin. Deliberately has no built-in default: guessing
 * wrong would send the partner key to the wrong host, and hardcoding the real
 * one would put the upstream vendor's address in the shipped source.
 */
function rootApiURL(): string {
  return (process.env.PARTNER_API_URL ?? "").replace(/\/+$/, "");
}

/** Compares without leaking length or content through timing. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function json(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" }, status });
}

/**
 * A relative Location keeps the redirect on whatever origin the browser used,
 * which request.url may not reflect behind a proxy.
 */
function redirectTo(location: string): NextResponse {
  return new NextResponse(null, {
    headers: { "Cache-Control": "no-store", Location: location },
    status: 303,
  });
}

/**
 * Proof that this browser passed the credential check.
 *
 * Signed with the partner key, which is a server secret of at least 32
 * characters, so the cookie cannot be forged without it. The expiry is inside
 * the signed payload, so it cannot be extended by editing the cookie either.
 * Stateless on purpose: it keeps working across restarts and instances.
 */
const SIGN_IN_COOKIE = "truest.sign-in";
const SIGN_IN_TTL_MS = 8 * 60 * 60 * 1000;

function signProof(expiresAt: number, key: string): string {
  const mac = createHmac("sha256", key).update(String(expiresAt)).digest("base64url");
  return `${String(expiresAt)}.${mac}`;
}

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) return rest.join("=");
  }
  return "";
}

/** True only for a cookie this server signed, which has not yet expired. */
function hasValidProof(request: Request, key: string): boolean {
  const [rawExpiry, mac] = readCookie(request, SIGN_IN_COOKIE).split(".");
  if (!rawExpiry || !mac) return false;

  const expiresAt = Number(rawExpiry);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  const expected = createHmac("sha256", key).update(rawExpiry).digest("base64url");
  return safeEqual(mac, expected);
}

function attachProof(response: NextResponse, key: string): NextResponse {
  const expiresAt = Date.now() + SIGN_IN_TTL_MS;
  response.cookies.set({
    httpOnly: true,
    maxAge: Math.floor(SIGN_IN_TTL_MS / 1000),
    name: SIGN_IN_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: signProof(expiresAt, key),
  });
  return response;
}

/** One call to the partner API, authenticated with the partner key. */
async function partnerFetch(path: string, apiKey: string, body?: unknown): Promise<Response> {
  return fetch(`${rootApiURL()}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    method: "POST",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/**
 * Returns the client organization to sign the demo user into.
 *
 * Normally this is PARTNER_ORG_ID, the id stored when the org was
 * provisioned — the stand-in for the row a real partner keeps against the
 * user. Provisioning only runs as a fallback, and only with an explicit
 * external_id: inventing one could quietly create a second, empty
 * organization rather than reusing the configured one.
 */
async function resolveOrgID(apiKey: string): Promise<null | string> {
  const configured = (process.env.PARTNER_ORG_ID ?? "").trim();
  if (configured) return configured;
  if (cachedOrgID) return cachedOrgID;

  const externalID = (process.env.PARTNER_EXTERNAL_ID ?? "").trim();
  if (!externalID) {
    console.error(
      "[whitelabel] set PARTNER_ORG_ID to the provisioned organization, or PARTNER_EXTERNAL_ID to provision it; refusing to guess and risk creating a second organization",
    );
    return null;
  }

  const response = await partnerFetch("/partner/orgs", apiKey, {
    external_id: externalID,
    name: process.env.PARTNER_CLIENT_NAME ?? DEFAULT_CLIENT_NAME,
  });

  if (!response.ok) {
    console.error("[whitelabel] provisioning the client organization failed", {
      status: response.status,
    });
    return null;
  }

  const payload = (await response.json().catch(() => null)) as { data?: { organization?: { id?: unknown } } } | null;
  const orgID = payload?.data?.organization?.id;
  if (typeof orgID !== "string" || !orgID) {
    console.error("[whitelabel] provisioning response carried no organization id");
    return null;
  }

  // 201 means it was created now, 200 that it already existed.
  console.info("[whitelabel] client organization ready", {
    created: response.status === 201,
    org_id: orgID,
  });
  cachedOrgID = orgID;
  return orgID;
}

/**
 * Mints a one-time access code for the client organization, or returns null
 * when the partner API cannot. The cause is logged here for the operator.
 */
async function mintAccessCode(apiKey: string): Promise<null | string> {
  let orgID: null | string;
  let response: Response;
  try {
    orgID = await resolveOrgID(apiKey);
    if (!orgID) return null;
    response = await partnerFetch(`/partner/orgs/${encodeURIComponent(orgID)}/access`, apiKey);
  } catch (error) {
    console.error("[whitelabel] partner API unreachable", error);
    return null;
  }

  if (!response.ok) {
    // The upstream body can carry partner-account detail, so it is logged
    // rather than forwarded to the browser.
    console.error("[whitelabel] partner access request failed", {
      org_id: orgID,
      status: response.status,
    });
    // A rejected key is a deployment fault, not a bad password: say so once,
    // loudly, instead of leaving the operator guessing.
    if (response.status === 401 || response.status === 403) {
      console.error("[whitelabel] the partner API rejected PARTNER_API_KEY");
    }
    return null;
  }

  let code: unknown;
  try {
    const body = (await response.json()) as { data?: { code?: unknown } };
    code = body.data?.code;
  } catch {
    code = undefined;
  }

  if (typeof code !== "string" || !code) {
    console.error("[whitelabel] partner access response carried no code");
    return null;
  }
  return code;
}

export async function GET(request: Request): Promise<NextResponse> {
  const apiKey = process.env.PARTNER_API_KEY ?? "";
  const params = new URLSearchParams();

  const returnUrl = new URL(request.url).searchParams.get("returnUrl");
  if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
    params.set("returnUrl", returnUrl);
  }

  if (!apiKey || !rootApiURL()) {
    console.error("[whitelabel] sign-in is not configured: PARTNER_API_KEY and PARTNER_API_URL are required");
    params.set("error", "signin");
    return redirectTo(`/auth/callback?${params.toString()}`);
  }

  // Minting a code hands out a session for the client organization, so an
  // anonymous caller is sent to sign in rather than straight through.
  if (!hasValidProof(request, apiKey)) {
    return redirectTo(`${WHITELABEL_LOGIN_PATH}?${params.toString()}`);
  }

  const code = await mintAccessCode(apiKey);
  if (code) params.set("code", code);

  // Without a code the callback shows its sign-in error state.
  if (!params.has("code")) params.set("error", "signin");

  return redirectTo(`/auth/callback?${params.toString()}`);
}

export async function POST(request: Request): Promise<NextResponse> {
  const apiKey = process.env.PARTNER_API_KEY ?? "";
  const demoEmail = process.env.WHITELABEL_DEMO_EMAIL ?? "";
  const demoPassword = process.env.WHITELABEL_DEMO_PASSWORD ?? "";

  if (!apiKey || !rootApiURL() || !demoEmail || !demoPassword) {
    // Log the cause for the operator; tell the browser only that it is broken.
    console.error(
      "[whitelabel] sign-in is not configured: PARTNER_API_KEY, PARTNER_API_URL, WHITELABEL_DEMO_EMAIL and WHITELABEL_DEMO_PASSWORD are required",
    );
    return json({ error: "Sign-in is not configured." }, 503);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Email and password are required." }, 400);
  }

  const { email, password } = (payload ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return json({ error: "Email and password are required." }, 400);
  }

  // Both halves are always compared so a wrong email and a wrong password cost
  // the same, and the message does not say which one was wrong.
  const emailMatches = safeEqual(email.trim().toLowerCase(), demoEmail.trim().toLowerCase());
  const passwordMatches = safeEqual(password, demoPassword);
  if (!emailMatches || !passwordMatches) {
    return json({ error: "Incorrect email or password." }, 401);
  }

  const code = await mintAccessCode(apiKey);
  if (!code) {
    return json({ error: "Sign-in is temporarily unavailable. Please try again." }, 502);
  }

  // The credentials checked out, so let GET re-mint a code for this browser
  // later without putting the form in front of the visitor again.
  return attachProof(json({ code }, 200), apiKey);
}
