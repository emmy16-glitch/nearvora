import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("demo mode defaults", () => {
  it("fails closed in production when DEMO_MODE is unset", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "");
    vi.resetModules();
    const { env } = await import("@/lib/config/env");
    expect(env.demoMode).toBe(false);
    expect(env.mode).toBe("live");
  });

  it("keeps local development in demo mode when DEMO_MODE is unset", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_MODE", "");
    vi.resetModules();
    const { env } = await import("@/lib/config/env");
    expect(env.demoMode).toBe(true);
    expect(env.mode).toBe("demo");
  });

  it("allows demo mode in production only when explicitly opted into", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "true");
    vi.resetModules();
    const { env } = await import("@/lib/config/env");
    expect(env.demoMode).toBe(true);
    expect(env.mode).toBe("demo");
  });

  it("respects explicit DEMO_MODE=false in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_MODE", "false");
    vi.resetModules();
    const { env } = await import("@/lib/config/env");
    expect(env.demoMode).toBe(false);
    expect(env.mode).toBe("live");
  });

  it("blocks self-custody transaction APIs in production until explicitly reviewed", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "false");
    vi.resetModules();
    const { NextRequest } = await import("next/server");
    const { proxy } = await import("@/proxy");
    const response = proxy(new NextRequest("https://nearvora.invalid/api/intents/swaps"));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "LIVE_RUNTIME_UNAVAILABLE" },
    });
  });
});
