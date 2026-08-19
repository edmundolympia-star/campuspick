import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const body = await request.json();
  if (body.action === "delete") {
    const { error } = await supabase.from("pickup_slots").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const slot = body.slot;
  const { error } = await supabase.from("pickup_slots").upsert({
    id: slot.id,
    vendor_id: slot.vendorId,
    pickup_time: slot.pickupTime,
    max_orders: slot.maxOrders,
    active: slot.active
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
