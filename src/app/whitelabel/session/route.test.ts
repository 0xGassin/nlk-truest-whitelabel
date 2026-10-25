import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The route keeps the provisioned org id in module scope, so each test imports
 * a fresh copy to start from a cold cache.
 */
async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

function post(body: unknown): Request {
  return new Request("http://localhost/whitelabel/session", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

const CREDENTIALS = { email: "demo@truest.ae", password: "truest-demo-2026" };
const ORG_ID = "11111111-2222-3333-4444-555555555555";

interface PartnerCall {
  init: RequestInit;
  url: string;
}

/** Answers the two partner calls the way the partner API does, recording each one. */
function partnerAPI({ provisionStatus = 201 }: { provisionStatus?: number } = {}) {
  const calls: PartnerCall[] = [];
  const fetchMock = vi.fn((url: string, init: RequestInit = {}) => {
    calls.push({ init, url });
    if (url.endsWith("/partner/orgs")) {
      return Promise.resolve(Response.json({ data: { organization: { id: ORG_ID } } }, { status: provisionStatus }));
    }
    if (url.endsWith(`/partner/orgs/${ORG_ID}/access`)) {
      return Promise.resolve(Response.json({ data: { code: "one-time-code", expires_in: 60 } }, { status: 200 }));
    }
    return Promise.resolve(new Response("unexpected", { status: 404 }));
  });
  return { calls, fetchMock };
}

/** The recorded call at `index`, or a clear failure when it was never made. */
function callAt(calls: PartnerCall[], index: number): PartnerCall {
  const call = calls.at(index);
  if (!call) {
    throw new Error(`expected a partner call at index ${String(index)}, saw ${String(calls.length)}`);
  }
  return call;
}

function authHeader(call: PartnerCall): string | undefined {
  return (call.init.headers as Record<string, string> | undefined)?.Authorization;
}

function jsonBody(call: PartnerCall): unknown {
  const { body } = call.init;
  if (typeof body !== "string") throw new TypeError("expected a JSON string body");
  return JSON.parse(body);
}

describe("whitelabel sign-in route", () => {
  beforeEach(() => {
    process.env.PARTNER_API_KEY = "nlk_test_key";
    process.env.PARTNER_API_URL = "https://rapi.example.com/api/v1";
    process.env.WHITELABEL_DEMO_EMAIL = CREDENTIALS.email;
    process.env.WHITELABEL_DEMO_PASSWORD = CREDENTIALS.password;
    process.env.PARTNER_EXTERNAL_ID = "truest-demo-client";
    process.env.PARTNER_CLIENT_NAME = "Truest Demo";
    delete process.env.PARTNER_ORG_ID;
    vi.spyOn(console, "error").mockImplementation(vi.fn());
    vi.spyOn(console, "info").mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("provisions the client org, then mints a code for it", async () => {
    const { calls, fetchMock } = partnerAPI();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadRoute();
    const response = await POST(post(CREDENTIALS));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ code: "one-time-code" });

    const provision = callAt(calls, 0);
    expect(provision.url).toBe("https://rapi.example.com/api/v1/partner/orgs");
    expect(jsonBody(provision)).toEqual({
      external_id: "truest-demo-client",
      name: "Truest Demo",
    });
    expect(authHeader(provision)).toBe("Bearer nlk_test_key");

    expect(callAt(calls, 1).url).toBe(`https://rapi.example.com/api/v1/partner/orgs/${ORG_ID}/access`);
  });

  it("returns the same org on a later sign-in instead of provisioning again", async () => {
    const { calls, fetchMock } = partnerAPI({ provisionStatus: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadRoute();
    await POST(post(CREDENTIALS));
    const second = await POST(post(CREDENTIALS));

    expect(second.status).toBe(200);
    // One provision for the first sign-in, then an access call per sign-in.
    expect(calls.filter((call) => call.url.endsWith("/partner/orgs"))).toHaveLength(1);
    expect(calls.filter((call) => call.url.endsWith("/access"))).toHaveLength(2);
  });

  it("skips provisioning when an org id is configured", async () => {
    process.env.PARTNER_ORG_ID = ORG_ID;
    const { calls, fetchMock } = partnerAPI();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadRoute();
    const response = await POST(post(CREDENTIALS));

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(callAt(calls, 0).url).toContain(`/partner/orgs/${ORG_ID}/access`);
  });

  it("refuses to provision rather than risk creating a second organization", async () => {
    // Neither the org id nor an explicit external id: guessing one here would
    // mint a new empty org instead of reusing the configured one.
    delete process.env.PARTNER_EXTERNAL_ID;
    const { calls, fetchMock } = partnerAPI();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadRoute();
    const response = await POST(post(CREDENTIALS));

    expect(response.status).toBe(502);
    expect(calls).toHaveLength(0);
  });

  it("rejects wrong credentials without calling the partner API", async () => {
    const { fetchMock } = partnerAPI();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadRoute();
    const wrongPassword = await POST(post({ ...CREDENTIALS, password: "nope" }));
    const wrongEmail = await POST(post({ ...CREDENTIALS, email: "attacker@evil.com" }));

    expect(wrongPassword.status).toBe(401);
    expect(wrongEmail.status).toBe(401);
    // Identical message, so the form cannot be used to discover the address.
    await expect(wrongPassword.json()).resolves.toEqual({ error: "Incorrect email or password." });
    await expect(wrongEmail.json()).resolves.toEqual({ error: "Incorrect email or password." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never forwards the partner key or upstream detail to the browser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({ detail: "bad key" }, { status: 401 }))),
    );

    const { POST } = await loadRoute();
    const response = await POST(post(CREDENTIALS));

    expect(response.status).toBe(502);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain("nlk_test_key");
    expect(body).not.toContain("bad key");
  });

  it("reports a missing configuration instead of signing anyone in", async () => {
    delete process.env.PARTNER_API_KEY;
    const { fetchMock } = partnerAPI();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadRoute();
    const response = await POST(post(CREDENTIALS));

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("automatic whitelabel sign-in route", () => {
  beforeEach(() => {
    process.env.PARTNER_API_KEY = "nlk_test_key";
    process.env.PARTNER_API_URL = "https://rapi.example.com/api/v1";
    process.env.PARTNER_ORG_ID = ORG_ID;
    vi.spyOn(console, "error").mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function get(query = ""): Request {
    return new Request(`http://localhost/whitelabel/session${query}`);
  }

  it("mints a code and redirects to the callback with the return path", async () => {
    vi.stubGlobal("fetch", partnerAPI().fetchMock);

    const { GET } = await loadRoute();
    const response = await GET(get(`?returnUrl=${encodeURIComponent("/issues?tab=open")}`));

    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(
      `/auth/callback?returnUrl=${encodeURIComponent("/issues?tab=open")}&code=one-time-code`,
    );
  });

  it("drops a return path that leaves the site", async () => {
    vi.stubGlobal("fetch", partnerAPI().fetchMock);

    const { GET } = await loadRoute();
    const response = await GET(get("?returnUrl=//evil.com"));

    expect(response.headers.get("Location")).toBe("/auth/callback?code=one-time-code");
  });

  it("redirects to the callback error state when no code can be minted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({ detail: "bad key" }, { status: 401 }))),
    );

    const { GET } = await loadRoute();
    const response = await GET(get());

    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/auth/callback?error=signin");
  });
});
