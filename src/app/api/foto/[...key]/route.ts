import { isWorkerd, getPhoto } from "@/lib/storage";

// Menyajikan foto dari R2 (Worker) atau filesystem (preview Node).
// Cache panjang karena nama file unik (immutable).
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const k = key.join("/");
  const headers = { "cache-control": "public, max-age=31536000, immutable" };

  if (isWorkerd()) {
    const obj = await getPhoto(k);
    if (!obj) return new Response("Not found", { status: 404 });
    return new Response(obj.body, { headers: { ...headers, "content-type": obj.contentType } });
  }

  const fs = await import("node:fs");
  const path = await import("node:path");
  const name = path.basename(k);
  const p = path.join(process.cwd(), "data", "uploads", name);
  if (!fs.existsSync(p)) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(p), { headers: { ...headers, "content-type": "image/webp" } });
}
