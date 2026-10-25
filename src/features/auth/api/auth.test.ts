// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();

vi.mock("@/services/api", () => ({ apiClient: { post } }));

const SESSION = {
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  token: "jwt",
  user: { email: "demo@truest.ae", id: "user-1" },
};

async function loadAuth() {
  vi.resetModules();
  return import("./auth");
}

describe("exchangeHandoff in a whitelabel build", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WHITELABEL_MODE", "true");
    post.mockResolvedValue({ data: { code: "ok", data: SESSION } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    post.mockReset();
    sessionStorage.clear();
  });

  it("asks for a token session and stores the token", async () => {
    const { exchangeHandoff } = await loadAuth();
    const { getSessionToken } = await import("@/lib/auth/session-token");

    const response = await exchangeHandoff("code-1");

    expect(post).toHaveBeenCalledWith("/api/v1/auth/callback", { code: "code-1", mode: "token" });
    expect(response.user.id).toBe("user-1");
    expect(getSessionToken()).toBe("jwt");
  });

  it("exchanges a code only once, however often it is asked", async () => {
    const { exchangeHandoff } = await loadAuth();

    const [first, second] = await Promise.all([exchangeHandoff("code-1"), exchangeHandoff("code-1")]);
    await exchangeHandoff("code-1");

    expect(post).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("clears the token on logout even when the request fails", async () => {
    const { exchangeHandoff, logout } = await loadAuth();
    const { getSessionToken } = await import("@/lib/auth/session-token");
    await exchangeHandoff("code-1");

    post.mockRejectedValueOnce(new Error("offline"));
    await expect(logout()).rejects.toThrow("offline");

    expect(post).toHaveBeenLastCalledWith("/api/v1/auth/logout");
    expect(getSessionToken()).toBeNull();
  });
});
