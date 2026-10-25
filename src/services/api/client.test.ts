// @vitest-environment jsdom
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendToRootLogin = vi.fn();
const sendToWhitelabelLogin = vi.fn();

vi.mock("@/lib/auth/root", () => ({ sendToRootLogin, sendToWhitelabelLogin }));

const inAnHour = () => new Date(Date.now() + 3_600_000).toISOString();

/** Answers every request with the given status, recording its headers. */
function respondWith(status: number) {
  const seen: AxiosHeaders[] = [];
  const adapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
    seen.push(AxiosHeaders.from(config.headers));
    const response = { config, data: {}, headers: {}, status, statusText: "" };
    if (status >= 400) {
      return Promise.reject(new AxiosError("failed", "ERR_BAD_REQUEST", config, null, response));
    }
    return Promise.resolve(response);
  };
  return { adapter, seen };
}

async function loadClient() {
  vi.resetModules();
  const { apiClient } = await import("./client");
  const tokens = await import("@/lib/auth/session-token");
  return { apiClient, ...tokens };
}

describe("apiClient in a whitelabel build", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WHITELABEL_MODE", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("sends the bearer token and no cookies", async () => {
    const { apiClient, setSessionToken } = await loadClient();
    setSessionToken("jwt", inAnHour());
    const { adapter, seen } = respondWith(200);

    await apiClient.get("/api/v1/users/me", { adapter });

    expect(apiClient.defaults.withCredentials).toBe(false);
    expect(seen[0]?.get("Authorization")).toBe("Bearer jwt");
  });

  it("sends no Authorization header without a token", async () => {
    const { apiClient } = await loadClient();
    const { adapter, seen } = respondWith(200);

    await apiClient.get("/api/v1/users/me", { adapter });

    expect(seen[0]?.has("Authorization")).toBe(false);
  });

  it("drops the token and restarts whitelabel sign-in on a 401", async () => {
    const { apiClient, getSessionToken, setSessionToken } = await loadClient();
    setSessionToken("jwt", inAnHour());

    await expect(apiClient.get("/api/v1/users/me", respondWith(401))).rejects.toThrow();

    expect(getSessionToken()).toBeNull();
    expect(sendToWhitelabelLogin).toHaveBeenCalledOnce();
    expect(sendToRootLogin).not.toHaveBeenCalled();
  });

  it("leaves a rejected callback exchange to the callback page", async () => {
    const { apiClient } = await loadClient();

    await expect(apiClient.post("/api/v1/auth/callback", {}, respondWith(401))).rejects.toThrow();

    expect(sendToWhitelabelLogin).not.toHaveBeenCalled();
  });
});

describe("apiClient in a root build", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the cookie session and sends a 401 to nulink-root", async () => {
    const { apiClient } = await loadClient();

    await expect(apiClient.get("/api/v1/users/me", respondWith(401))).rejects.toThrow();

    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(sendToRootLogin).toHaveBeenCalledOnce();
    expect(sendToWhitelabelLogin).not.toHaveBeenCalled();
  });
});
