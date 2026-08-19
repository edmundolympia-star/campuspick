import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const bucket = "campuspick";

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { dataUrl, folder = "uploads" } = await request.json();
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl ?? "");
  if (!match) return NextResponse.json({ error: "Invalid image" }, { status: 400 });

  await supabase.storage.createBucket(bucket, { public: true }).catch(() => undefined);

  const contentType = match[1];
  const extension = contentType.includes("png") ? "png" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(match[2], "base64");
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType, upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ publicUrl: data.publicUrl });
}
