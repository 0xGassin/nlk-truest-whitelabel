// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { clearSessionToken, getSessionToken, setSessionToken } from "./session-token";

const inAnHour = () => new Date(Date.now() + 3_600_000).toISOString();

describe("session token", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("returns the stored token until it is cleared", () => {
    setSessionToken("jwt", inAnHour());
    expect(getSessionToken()).toBe("jwt");

    clearSessionToken();
    expect(getSessionToken()).toBeNull();
  });

  it("treats an expired token as absent and discards it", () => {
    setSessionToken("jwt", new Date(Date.now() - 1000).toISOString());
    expect(getSessionToken()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it("treats a malformed entry as absent", () => {
    sessionStorage.setItem("truest.session-token", "not json");
    expect(getSessionToken()).toBeNull();
  });
});
