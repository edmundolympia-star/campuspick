import { createClient } from "@supabase/supabase-js";
import { todayInPickupZone } from "./order-dates";
import type { DemoState, MenuItem, Order, OrderItem, PickupSlot, Vendor } from "./types";

export function hasCloudEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createSupabaseAdmin() {
  if (!hasCloudEnv()) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
  });
}

export function toVendor(row: any): Vendor {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    heroMessage: row.hero_message ?? row.description ?? "",
    subtext: row.subtext ?? "",
    logoUrl: row.logo_url ?? "",
    duitnowQrUrl: row.duitnow_qr_url ?? ""
  };
}

export function toMenuItem(row: any): MenuItem {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    name: row.name,
    chineseName: row.chinese_name,
    description: row.description ?? "",
    price: Number(row.price),
    dailyStock: Number(row.daily_stock),
    available: Boolean(row.available),
    imageUrl: row.image_url ?? ""
  };
}

export function toPickupSlot(row: any): PickupSlot {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    pickupTime: String(row.pickup_time).slice(0, 5),
    maxOrders: Number(row.max_orders),
    active: Boolean(row.active)
  };
}

export async function loadCloudState(slug = "riceball-campus"): Promise<DemoState | null> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return null;

  const { data: vendorRow, error: vendorError } = await supabase
    .from("vendors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (vendorError) throw vendorError;
  if (!vendorRow) return null;

  const vendor = toVendor(vendorRow);
  const [{ data: menuRows, error: menuError }, { data: slotRows, error: slotError }, { data: orderRows, error: orderError }] =
    await Promise.all([
      supabase.from("menu_items").select("*").eq("vendor_id", vendor.id).order("created_at"),
      supabase.from("pickup_slots").select("*").eq("vendor_id", vendor.id).order("pickup_time"),
      supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("vendor_id", vendor.id)
        .gte("order_date", todayInPickupZone())
        .limit(300)
        .order("order_date")
        .order("pickup_time")
    ]);

  if (menuError) throw menuError;
  if (slotError) throw slotError;
  if (orderError) throw orderError;

  const menuItems = (menuRows ?? []).map(toMenuItem);
  const menuById = new Map(menuItems.map((item) => [item.id, item]));
  const orders: Order[] = (orderRows ?? []).map((order: any) => ({
    id: order.id,
    vendorId: order.vendor_id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    phoneLast4: order.phone_last4,
    pickupTime: String(order.pickup_time).slice(0, 5),
    pickupDate: order.order_date,
    paymentMethod: order.payment_method,
    status: order.status,
    totalAmount: Number(order.total_amount),
    createdAt: order.created_at,
    items: (order.order_items ?? []).map((line: any): OrderItem => {
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
  }));

  return {
    vendors: [vendor],
    menuItems,
    pickupSlots: (slotRows ?? []).map(toPickupSlot),
    orders
  };
}
