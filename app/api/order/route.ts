import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { nextPickupDate } from "@/lib/order-dates";

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const body = await request.json();
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("paused, pause_message")
    .eq("slug", body.vendorSlug)
    .maybeSingle();
  if (vendorError) return NextResponse.json({ error: vendorError.message }, { status: 400 });
  if (vendor?.paused) return NextResponse.json({ error: vendor.pause_message || "今天暂时停止接单。" }, { status: 400 });

  const items = Object.entries(body.quantities)
    .filter(([, quantity]) => Number(quantity) > 0)
    .map(([menu_item_id, quantity]) => ({ menu_item_id, quantity }));

  const { data, error } = await supabase.rpc("place_order", {
    p_vendor_slug: body.vendorSlug,
    p_customer_name: body.customerName,
    p_phone_last4: body.phoneLast4,
    p_pickup_date: nextPickupDate(),
    p_pickup_time: body.pickupTime,
    p_payment_method: body.paymentMethod,
    p_items: items
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ orderId: data?.[0]?.order_id, orderNumber: data?.[0]?.order_number });
}
