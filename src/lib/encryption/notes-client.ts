export async function decryptNotes(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { v?: number; iv?: string; tag?: string; ct?: string };
  if (p.v !== 1 || !p.iv || !p.tag || !p.ct) return null;

  // Client-side decryption using Web Crypto API
  try {
    const secret = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET;
    if (!secret) return null;

    // Derive key from secret
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("salt"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const iv = Uint8Array.from(atob(p.iv), (c) => c.charCodeAt(0));
    const tag = Uint8Array.from(atob(p.tag), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(p.ct), (c) => c.charCodeAt(0));

    // Combine ciphertext and tag for Web Crypto API
    const combined = new Uint8Array(ct.length + tag.length);
    combined.set(ct);
    combined.set(tag, ct.length);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      combined
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}
