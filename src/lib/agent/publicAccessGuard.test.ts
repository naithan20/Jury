import { afterEach, describe, expect, it, vi } from "vitest";

const originalFlag = process.env.AGENT_PUBLIC_ACCESS_ENABLED;

afterEach(() => {
  if (originalFlag === undefined) delete process.env.AGENT_PUBLIC_ACCESS_ENABLED;
  else process.env.AGENT_PUBLIC_ACCESS_ENABLED = originalFlag;
  vi.doUnmock("@/lib/jury/model");
  vi.resetModules();
});

describe("checkPublicAgentAccess", () => {
  it("is enabled by default (no env var required) when the model is the known-free one", async () => {
    delete process.env.AGENT_PUBLIC_ACCESS_ENABLED;
    vi.doMock("@/lib/jury/model", () => ({ SELECTED_MODEL_ID: "openrouter/free" }));
    vi.resetModules();
    const { checkPublicAgentAccess } = await import("./publicAccessGuard");
    expect(checkPublicAgentAccess()).toBe("ok");
  });

  it("disables automatically when the configured model is not on the known-free allowlist", async () => {
    vi.doMock("@/lib/jury/model", () => ({ SELECTED_MODEL_ID: "openai/gpt-5" }));
    vi.resetModules();
    const { checkPublicAgentAccess } = await import("./publicAccessGuard");
    expect(checkPublicAgentAccess()).toBe("disabled");
  });

  it("disables when AGENT_PUBLIC_ACCESS_ENABLED is explicitly 'false', even on the free model", async () => {
    process.env.AGENT_PUBLIC_ACCESS_ENABLED = "false";
    vi.doMock("@/lib/jury/model", () => ({ SELECTED_MODEL_ID: "openrouter/free" }));
    vi.resetModules();
    const { checkPublicAgentAccess } = await import("./publicAccessGuard");
    expect(checkPublicAgentAccess()).toBe("disabled");
  });

  it("treats any value other than the literal string 'false' as enabled", async () => {
    process.env.AGENT_PUBLIC_ACCESS_ENABLED = "true";
    vi.doMock("@/lib/jury/model", () => ({ SELECTED_MODEL_ID: "openrouter/free" }));
    vi.resetModules();
    const { checkPublicAgentAccess } = await import("./publicAccessGuard");
    expect(checkPublicAgentAccess()).toBe("ok");
  });
});
