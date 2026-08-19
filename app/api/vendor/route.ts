import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const vendor = await request.json();
  const { error } = await supabase
    .from("vendors")
    .update({
      name: vendor.name,
      slug: vendor.slug,
      description: vendor.description,
      hero_message: vendor.heroMessage,
      subtext: vendor.subtext,
      logo_url: vendor.logoUrl,
      duitnow_qr_url: vendor.duitnowQrUrl,
      paused: Boolean(vendor.paused),
      pause_message: vendor.pauseMessage ?? ""
    })
    .eq("id", vendor.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
