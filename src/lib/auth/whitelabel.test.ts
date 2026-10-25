// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const assign = vi.fn();

/** Puts the browser on `url` and loads a fresh copy of the module. */
async function loadAt(url: string) {
  vi.resetModules();
  // URL exposes its parts as prototype getters, so spreading one yields an
  // empty object and every lookup below would be undefined. Copy explicitly.
  const { hash, href, origin, pathname, search } = new URL(url, "http://localhost");
  vi.stubGlobal("location", { assign, hash, href, origin, pathname, search });
  return import("./whitelabel");
}

describe("automatic whitelabel sign-in", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    assign.mockReset();
    sessionStorage.clear();
  });

  it("goes to the session route, carrying the page to return to", async () => {
    const { sendToWhitelabelSignIn } = await loadAt("/issues?tab=open");

    expect(sendToWhitelabelSignIn()).toBe(true);
    expect(assign).toHaveBeenCalledWith(`/whitelabel/session?returnUrl=${encodeURIComponent("/issues?tab=open")}`);
  });

  it("counts parallel calls from one page as one attempt", async () => {
    const { sendToWhitelabelSignIn } = await loadAt("/dashboard");

    sendToWhitelabelSignIn();
    sendToWhitelabelSignIn();

    expect(assign).toHaveBeenCalledOnce();
  });

  it("stops after two attempts in a row and shows the callback error", async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { sendToWhitelabelSignIn } = await loadAt("/auth/callback?error=signin&returnUrl=%2Fissues");
      expect(sendToWhitelabelSignIn()).toBe(true);
    }

    const onCallback = await loadAt("/auth/callback?error=signin&returnUrl=%2Fissues");
    assign.mockClear();
    expect(onCallback.sendToWhitelabelSignIn()).toBe(false);
    expect(assign).not.toHaveBeenCalled();

    const elsewhere = await loadAt("/dashboard");
    expect(elsewhere.sendToWhitelabelSignIn()).toBe(false);
    expect(assign).toHaveBeenCalledWith(`/auth/callback?returnUrl=${encodeURIComponent("/dashboard")}&error=signin`);
  });

  it("tries again once the window has passed or on request", async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { sendToWhitelabelSignIn } = await loadAt("/dashboard");
      sendToWhitelabelSignIn();
    }

    vi.advanceTimersByTime(61_000);
    expect((await loadAt("/dashboard")).sendToWhitelabelSignIn()).toBe(true);

    const { resetWhitelabelSignIn, sendToWhitelabelSignIn } = await loadAt("/auth/callback?error=signin");
    expect(sendToWhitelabelSignIn()).toBe(false);
    resetWhitelabelSignIn();
    expect((await loadAt("/auth/callback?error=signin")).sendToWhitelabelSignIn()).toBe(true);
  });
});
