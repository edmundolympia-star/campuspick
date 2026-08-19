"use client";

import { initialState, todayKey } from "./demo-data";
import { nextPickupDate } from "./order-dates";
import type { DemoState, MenuItem, Order, OrderStatus, PaymentMethod, PickupSlot, Vendor } from "./types";

const key = `campuspick-demo-${todayKey()}`;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function loadState(): DemoState {
  if (typeof window === "undefined") return clone(initialState);
  const saved = window.localStorage.getItem(key);
  if (!saved) {
    window.localStorage.setItem(key, JSON.stringify(initialState));
    return clone(initialState);
  }
  const parsed = JSON.parse(saved) as DemoState;
  const migrated: DemoState = {
    ...clone(initialState),
    ...parsed,
    vendors: parsed.vendors.map((vendor) => ({
      ...vendor,
      heroMessage: vendor.heroMessage ?? vendor.description ?? "今天的饭团，先订，再来拿。",
      subtext: vendor.subtext ?? "无需排队 · 选择取餐时间 · 到店直接取",
      logoUrl: vendor.logoUrl ?? "",
      duitnowQrUrl: vendor.duitnowQrUrl ?? "",
      paused: vendor.paused ?? false,
      pauseMessage: vendor.pauseMessage ?? "今天暂时停止接单。"
    })),
    menuItems: parsed.menuItems.map((item) => ({ ...item, imageUrl: item.imageUrl ?? "" })),
    orders: parsed.orders.map((order) => ({ ...order, pickupDate: order.pickupDate ?? todayKey() }))
  };
  window.localStorage.setItem(key, JSON.stringify(migrated));
  return migrated;
}

export function saveState(state: DemoState) {
  window.localStorage.setItem(key, JSON.stringify(state));
  window.dispatchEvent(new Event("campuspick-state"));
}

export function activeOrders(state: DemoState, vendorId: string, pickupDate?: string) {
  return state.orders.filter(
    (order) => order.vendorId === vendorId && order.status !== "cancelled" && (!pickupDate || order.pickupDate === pickupDate)
  );
}

export function findOrder(orderId: string) {
  const state = loadState();
  return state.orders.find((order) => order.id === orderId) ?? null;
}

export function findOrderByNumber(orderNumber: string, phoneLast4: string) {
  const state = loadState();
  return (
    state.orders.find(
      (order) => order.orderNumber.toLowerCase() === orderNumber.trim().toLowerCase() && order.phoneLast4 === phoneLast4
    ) ?? null
  );
}

export function remainingForItem(state: DemoState, item: MenuItem, pickupDate?: string) {
  const reserved = activeOrders(state, item.vendorId, pickupDate)
    .flatMap((order) => order.items)
    .filter((line) => line.menuItemId === item.id)
    .reduce((sum, line) => sum + line.quantity, 0);
  return Math.max(item.dailyStock - reserved, 0);
}

export function slotUsed(state: DemoState, slot: PickupSlot, pickupDate?: string) {
  return activeOrders(state, slot.vendorId, pickupDate).filter((order) => order.pickupTime === slot.pickupTime).length;
}

export function createOrder(input: {
  vendorId: string;
  quantities: Record<string, number>;
  pickupTime: string;
  customerName: string;
  phoneLast4: string;
  paymentMethod: PaymentMethod;
}): Order {
  const state = loadState();
  const pickupDate = nextPickupDate();
  const vendor = state.vendors.find((item) => item.id === input.vendorId);
  if (vendor?.paused) throw new Error(vendor.pauseMessage || "今天暂时停止接单。");
  const slot = state.pickupSlots.find((item) => item.vendorId === input.vendorId && item.pickupTime === input.pickupTime);
  if (!slot || !slot.active || slotUsed(state, slot, pickupDate) >= slot.maxOrders) {
    throw new Error("这个取餐时间已满，请选择其他时间。");
  }

  const lines = Object.entries(input.quantities).filter(([, quantity]) => quantity > 0);
  if (!lines.length) throw new Error("请选择至少一份餐点。");

  const items = lines.map(([itemId, quantity]) => {
    const item = state.menuItems.find((menuItem) => menuItem.id === itemId && menuItem.vendorId === input.vendorId);
    if (!item || !item.available) throw new Error("有餐点暂时无法预订。");
    if (quantity > remainingForItem(state, item, pickupDate)) throw new Error(`${item.chineseName} 库存不足。`);
    return { item, quantity };
  });

  const todayOrders = state.orders.filter((order) => order.vendorId === input.vendorId && order.pickupDate === pickupDate);
  const prefix = vendor?.slug.includes("riceball") ? "RB" : "CP";
  const orderNumber = `${prefix}${String(todayOrders.length + 1).padStart(3, "0")}`;
  const orderId = crypto.randomUUID();
  const orderItems = items.map(({ item, quantity }) => ({
    id: crypto.randomUUID(),
    orderId,
    menuItemId: item.id,
    itemName: item.name,
    chineseName: item.chineseName,
    quantity,
    unitPrice: item.price
  }));
  const order: Order = {
    id: orderId,
    vendorId: input.vendorId,
    orderNumber,
    customerName: input.customerName,
    phoneLast4: input.phoneLast4,
    pickupTime: input.pickupTime,
    pickupDate,
    paymentMethod: input.paymentMethod,
    status: "pending",
    totalAmount: orderItems.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    createdAt: new Date().toISOString(),
    items: orderItems
  };

  state.orders.push(order);
  saveState(state);
  return order;
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const state = loadState();
  state.orders = state.orders.map((order) => (order.id === orderId ? { ...order, status } : order));
  saveState(state);
}

export function cancelOrder(orderId: string, phoneLast4: string) {
  const state = loadState();
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) throw new Error("找不到订单。");
  if (order.phoneLast4 !== phoneLast4) throw new Error("手机号码后 4 位不正确。");
  if (order.status !== "pending") throw new Error("这个订单已经在处理，不能取消。");
  if (Date.now() - new Date(order.createdAt).getTime() > 30 * 60 * 1000) {
    throw new Error("已超过 30 分钟，不能取消。");
  }
  state.orders = state.orders.map((item) => (item.id === orderId ? { ...item, status: "cancelled" } : item));
  saveState(state);
}

export function upsertMenuItem(item: MenuItem) {
  const state = loadState();
  const exists = state.menuItems.some((menuItem) => menuItem.id === item.id);
  state.menuItems = exists ? state.menuItems.map((menuItem) => (menuItem.id === item.id ? item : menuItem)) : [item, ...state.menuItems];
  saveState(state);
}

export function deleteMenuItem(itemId: string) {
  const state = loadState();
  state.menuItems = state.menuItems.filter((item) => item.id !== itemId);
  saveState(state);
}

export function updateVendor(vendor: Vendor) {
  const state = loadState();
  state.vendors = state.vendors.map((item) => (item.id === vendor.id ? vendor : item));
  saveState(state);
}

export function upsertPickupSlot(slot: PickupSlot) {
  const state = loadState();
  const exists = state.pickupSlots.some((item) => item.id === slot.id);
  state.pickupSlots = exists ? state.pickupSlots.map((item) => (item.id === slot.id ? slot : item)) : [...state.pickupSlots, slot];
  state.pickupSlots.sort((a, b) => a.pickupTime.localeCompare(b.pickupTime));
  saveState(state);
}

export function deletePickupSlot(slotId: string) {
  const state = loadState();
  state.pickupSlots = state.pickupSlots.filter((slot) => slot.id !== slotId);
  saveState(state);
}
