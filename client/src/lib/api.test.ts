import { afterEach, describe, expect, it, vi } from "vitest";
import { apiConfig, apiRequest } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("KCG Apps Script API client", () => {
  it("is configured for the staging endpoint", () => {
    expect(apiConfig.configured).toBe(true);
    expect(apiConfig.url).toBe("configured");
  });

  it("adds sessionToken and idempotencyKey to mutation requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, requestId: "req-1", apiVersion: "v1", data: { visitId: "visit-1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("sessionStorage", { getItem: () => "session-1" });

    await apiRequest("visits.create", { personId: "person-1", householdId: "home-1", visitType: "home_visit" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.sessionToken).toBe("session-1");
    expect(body.apiVersion).toBe("v1");
    expect(body.action).toBe("visits.create");
    expect(typeof body.idempotencyKey).toBe("string");
    expect(body.personId).toBe("person-1");
  });
});
