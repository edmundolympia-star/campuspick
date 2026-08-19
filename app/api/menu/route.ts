import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const body = await request.json();
  if (body.action === "delete") {
    const { error } = await supabase.from("menu_items").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const item = body.item;
  const { error } = await supabase.from("menu_items").upsert({
    id: item.id,
    vendor_id: item.vendorId,
    name: item.name,
    chinese_name: item.chineseName,
    description: item.description,
    price: item.price,
    daily_stock: item.dailyStock,
    available: item.available,
    image_url: item.imageUrl
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
