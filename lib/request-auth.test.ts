import { describe, expect, it } from "vitest";
import { hasBearerSecret, hasHeaderSecret } from "./request-auth";

const req = (headers: Record<string, string>) => new Request("https://x.test", { headers });

describe("hasBearerSecret", () => {
  it("accepts the matching bearer token", () => {
    expect(hasBearerSecret(req({ authorization: "Bearer s3cret" }), "s3cret")).toBe(true);
  });

  it("rejects a wrong or missing token", () => {
    expect(hasBearerSecret(req({ authorization: "Bearer nope" }), "s3cret")).toBe(false);
    expect(hasBearerSecret(req({}), "s3cret")).toBe(false);
  });

  it("rejects everything when the secret is not configured", () => {
    expect(hasBearerSecret(req({ authorization: "Bearer " }), "")).toBe(false);
  });
});

describe("hasHeaderSecret", () => {
  it("checks the named header", () => {
    const r = req({ "x-telegram-bot-api-secret-token": "abc" });
    expect(hasHeaderSecret(r, "x-telegram-bot-api-secret-token", "abc")).toBe(true);
    expect(hasHeaderSecret(r, "x-telegram-bot-api-secret-token", "abd")).toBe(false);
  });
});
