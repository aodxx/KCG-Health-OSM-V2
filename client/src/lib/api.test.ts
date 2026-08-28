import { describe, expect, it } from "vitest";
import { apiConfig } from "./api";

describe("KCG Apps Script API client", () => {
  it("is configured for the staging endpoint", () => {
    expect(apiConfig.configured).toBe(true);
    expect(apiConfig.url).toBe("configured");
  });
});
