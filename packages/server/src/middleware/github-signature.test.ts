import { describe, expect, it } from "bun:test";
import { verifyGitHubSignature } from "./github-signature.js";

describe("verifyGitHubSignature", () => {
  const secret = "test-secret";

  async function sign(payload: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(key),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `sha256=${hex}`;
  }

  it("returns true for a valid signature", async () => {
    const body = '{"action":"opened"}';
    const signature = await sign(body, secret);
    const result = await verifyGitHubSignature(body, signature, secret);
    expect(result).toBe(true);
  });

  it("returns false for an invalid signature", async () => {
    const body = '{"action":"opened"}';
    const result = await verifyGitHubSignature(body, "sha256=bad", secret);
    expect(result).toBe(false);
  });

  it("returns false for a missing signature", async () => {
    const body = '{"action":"opened"}';
    const result = await verifyGitHubSignature(body, "", secret);
    expect(result).toBe(false);
  });

  it("returns false if body was tampered with", async () => {
    const body = '{"action":"opened"}';
    const signature = await sign(body, secret);
    const result = await verifyGitHubSignature('{"action":"closed"}', signature, secret);
    expect(result).toBe(false);
  });
});
