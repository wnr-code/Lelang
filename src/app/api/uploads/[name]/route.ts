import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

// Di mode Supabase, foto disimpan di Supabase Storage dan diakses lewat URL
// publik langsung (photos.file_path), sehingga route lokal ini tidak dipakai.
// Route ini hanya melayani foto unggahan lokal pada mode SQLite (preview).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return new NextResponse("Not found", { status: 404 });
  if (isSupabaseConfigured()) return new NextResponse("Not found", { status: 404 });

  const fs = await import("node:fs");
  const path = await import("node:path");
  const filePath = path.join(process.cwd(), "data", "uploads", name);
  if (!fs.existsSync(filePath)) return new NextResponse("Not found", { status: 404 });
  const buf = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
