import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { orderId, phoneLast4 } = await request.json();
  if (!orderId || !/^\d{4}$/.test(phoneLast4 ?? "")) {
    return NextResponse.json({ error: "Order ID and phone last 4 digits are required." }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, phone_last4, status, created_at")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.phone_last4 !== phoneLast4) return NextResponse.json({ error: "Phone last 4 digits do not match." }, { status: 403 });
  if (order.status !== "pending") return NextResponse.json({ error: "This order is already being prepared and cannot be cancelled." }, { status: 400 });
  if (Date.now() - new Date(order.created_at).getTime() > 30 * 60 * 1000) {
    return NextResponse.json({ error: "The 30-minute cancellation window has passed." }, { status: 400 });
  }

  const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
