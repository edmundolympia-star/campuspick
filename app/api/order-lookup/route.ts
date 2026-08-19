import { NextResponse } from "next/server";
import { createSupabaseAdmin, toMenuItem, toVendor } from "@/lib/supabase-admin";
import type { Order, OrderItem } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { orderId, orderNumber, phoneLast4 } = await request.json();
  if (!orderId && !/^\d{4}$/.test(phoneLast4 ?? "")) {
    return NextResponse.json({ error: "Phone last 4 digits are required." }, { status: 400 });
  }

  let query = supabase.from("orders").select("*, order_items(*)").order("order_date", { ascending: false }).order("pickup_time", { ascending: false }).limit(orderNumber || orderId ? 1 : 10);
  if (orderId) query = query.eq("id", orderId);
  if (orderNumber) query = query.ilike("order_number", orderNumber.trim());
  if (phoneLast4) query = query.eq("phone_last4", phoneLast4);

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
  const toOrder = (row: any): Order => ({
    id: row.id,
    vendorId: row.vendor_id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    phoneLast4: row.phone_last4,
    pickupTime: String(row.pickup_time).slice(0, 5),
    pickupDate: row.order_date,
    paymentMethod: row.payment_method,
    status: row.status,
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at,
    items: (row.order_items ?? []).map((line: any): OrderItem => {
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
  });
  const orders = (orderRows ?? []).map(toOrder);

  return NextResponse.json({ order: orders[0], orders, vendor: toVendor(vendorRow) });
}
