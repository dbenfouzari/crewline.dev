/**
 * Verify GitHub webhook signature using HMAC SHA-256.
 * Uses Web Crypto API (available in Bun natively).
 */
export async function verifyGitHubSignature(
  body: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected =
    "sha256=" +
    Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return signatureHeader === expected;
}
