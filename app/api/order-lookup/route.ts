import { NextResponse } from "next/server";
import { createSupabaseAdmin, toMenuItem, toVendor } from "@/lib/supabase-admin";
import type { Order, OrderItem } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { orderId, orderNumber, phoneLast4 } = await request.json();
  let query = supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(1);
  if (orderId) query = query.eq("id", orderId);
  if (orderNumber) query = query.ilike("order_number", orderNumber.trim());
  if (phoneLast4) query = query.eq("phone_last4", phoneLast4);
  if (!orderId && !orderNumber) return NextResponse.json({ error: "Order number is required." }, { status: 400 });

  const { data: orderRows, error: orderError } = await query;
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 });
  const orderRow = orderRows?.[0];
  if (!orderRow) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const [{ data: vendorRow, error: vendorError }, { data: menuRows, error: menuError }] = await Promise.all([
    supabase.from("vendors").select("*").eq("id", orderRow.vendor_id).single(),
    supabase.from("menu_items").select("*").eq("vendor_id", orderRow.vendor_id)
  ]);
  if (vendorError) return NextResponse.json({ error: vendorError.message }, { status: 400 });
  if (menuError) return NextResponse.json({ error: menuError.message }, { status: 400 });

  const menuById = new Map((menuRows ?? []).map((row) => {
    const item = toMenuItem(row);
    return [item.id, item];
  }));
  const order: Order = {
    id: orderRow.id,
    vendorId: orderRow.vendor_id,
    orderNumber: orderRow.order_number,
    customerName: orderRow.customer_name,
    phoneLast4: orderRow.phone_last4,
    pickupTime: String(orderRow.pickup_time).slice(0, 5),
    pickupDate: orderRow.order_date,
    paymentMethod: orderRow.payment_method,
    status: orderRow.status,
    totalAmount: Number(orderRow.total_amount),
    createdAt: orderRow.created_at,
    items: (orderRow.order_items ?? []).map((line: any): OrderItem => {
      const item = menuById.get(line.menu_item_id);
      return {
        id: line.id,
        orderId: line.order_id,
        menuItemId: line.menu_item_id,
        itemName: item?.name ?? "Menu item",
        chineseName: item?.chineseName ?? "餐点",
        quantity: Number(line.quantity),
        unitPrice: Number(line.unit_price)
      };
    })
  };

  return NextResponse.json({ order, vendor: toVendor(vendorRow) });
}
