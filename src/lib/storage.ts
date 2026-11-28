// Penyimpanan foto durabel: Cloudflare R2 di Worker, filesystem di preview Node.
// Binding R2: `Lelang` -> bucket `liqo` (lihat wrangler.jsonc).
// Foto diakses lewat route /api/foto/[...key] sehingga tidak perlu domain publik bucket.

export function isWorkerd(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

type R2BucketLike = {
  put(key: string, value: Uint8Array, opts?: unknown): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<void>;
};

async function bucket(): Promise<R2BucketLike> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = getCloudflareContext();
  const b = (env as Record<string, unknown>).Lelang as R2BucketLike | undefined;
  if (!b) throw new Error("Binding R2 `Lelang` (bucket liqo) belum tersedia di Worker.");
  return b;
}

export async function putPhoto(key: string, bytes: Uint8Array): Promise<void> {
  const b = await bucket();
  await b.put(key, bytes, {
    httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" },
  });
}

export async function getPhoto(key: string): Promise<{ body: ReadableStream; contentType: string } | null> {
  const b = await bucket();
  const obj = await b.get(key);
  if (!obj) return null;
  return { body: obj.body, contentType: obj.httpMetadata?.contentType ?? "image/webp" };
}

export async function deletePhotoObject(key: string): Promise<void> {
  const b = await bucket();
  await b.delete(key);
}
