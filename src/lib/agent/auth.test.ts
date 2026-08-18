import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkAgentAuth, getAgentKeyId } from "./auth";

function reqWithAuth(header?: string): Request {
  const headers = new Headers();
  if (header !== undefined) headers.set("authorization", header);
  return new Request("http://localhost/api/agent/evaluate", { method: "POST", headers });
}

describe("checkAgentAuth", () => {
  const originalKey = process.env.AGENT_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.AGENT_API_KEY;
    else process.env.AGENT_API_KEY = originalKey;
  });

  it("fails closed when AGENT_API_KEY is not set", () => {
    delete process.env.AGENT_API_KEY;
    expect(checkAgentAuth(reqWithAuth("Bearer anything"))).toBe("not_configured");
  });

  describe("with AGENT_API_KEY set", () => {
    beforeEach(() => {
      process.env.AGENT_API_KEY = "correct-horse-battery-staple";
    });

    it("rejects a missing Authorization header", () => {
      expect(checkAgentAuth(reqWithAuth())).toBe("unauthorized");
    });

    it("rejects a non-Bearer scheme", () => {
      expect(checkAgentAuth(reqWithAuth("Basic dXNlcjpwYXNz"))).toBe("unauthorized");
    });

    it("rejects an empty Bearer token", () => {
      expect(checkAgentAuth(reqWithAuth("Bearer "))).toBe("unauthorized");
    });

    it("rejects the wrong token", () => {
      expect(checkAgentAuth(reqWithAuth("Bearer wrong-token"))).toBe("unauthorized");
    });

    it("rejects a token that only differs in length", () => {
      expect(checkAgentAuth(reqWithAuth("Bearer correct-horse-battery-staple-extra"))).toBe(
        "unauthorized",
      );
    });

    it("accepts the correct token", () => {
      expect(checkAgentAuth(reqWithAuth("Bearer correct-horse-battery-staple"))).toBe("ok");
    });

    it("is case-insensitive on the Bearer scheme keyword", () => {
      expect(checkAgentAuth(reqWithAuth("bearer correct-horse-battery-staple"))).toBe("ok");
    });
  });
});

describe("getAgentKeyId", () => {
  it("returns null when there is no bearer token", () => {
    expect(getAgentKeyId(reqWithAuth())).toBeNull();
  });

  it("returns a stable, non-reversible id for a given token", () => {
    const idA1 = getAgentKeyId(reqWithAuth("Bearer my-token"));
    const idA2 = getAgentKeyId(reqWithAuth("Bearer my-token"));
    const idB = getAgentKeyId(reqWithAuth("Bearer other-token"));

    expect(idA1).not.toBeNull();
    expect(idA1).toEqual(idA2);
    expect(idA1).not.toEqual(idB);
    expect(idA1).not.toContain("my-token");
  });
});
