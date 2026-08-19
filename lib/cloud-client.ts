"use client";

import type { DemoState, MenuItem, OrderStatus, PickupSlot, Vendor } from "./types";

export type CloudStateResponse = {
  mode: "cloud" | "demo";
  state: DemoState;
  error?: string;
};

async function jsonRequest<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload as T;
}

export function fetchCloudState(slug = "riceball-campus") {
  return jsonRequest<CloudStateResponse>(`/api/state?slug=${encodeURIComponent(slug)}`);
}

export function saveCloudMenuItem(item: MenuItem) {
  return jsonRequest<{ ok: true }>("/api/menu", { item });
}

export function deleteCloudMenuItem(id: string) {
  return jsonRequest<{ ok: true }>("/api/menu", { action: "delete", id });
}

export function saveCloudVendor(vendor: Vendor) {
  return jsonRequest<{ ok: true }>("/api/vendor", vendor);
}

export function saveCloudPickupSlot(slot: PickupSlot) {
  return jsonRequest<{ ok: true }>("/api/slot", { slot });
}

export function deleteCloudPickupSlot(id: string) {
  return jsonRequest<{ ok: true }>("/api/slot", { action: "delete", id });
}

export function uploadCloudImage(dataUrl: string, folder: string) {
  return jsonRequest<{ publicUrl: string }>("/api/upload", { dataUrl, folder });
}

export function createCloudOrder(input: {
  vendorSlug: string;
  quantities: Record<string, number>;
  pickupTime: string;
  customerName: string;
  phoneLast4: string;
  paymentMethod: string;
}) {
  return jsonRequest<{ orderId: string; orderNumber: string }>("/api/order", input);
}

export function updateCloudOrderStatus(orderId: string, status: OrderStatus) {
  return jsonRequest<{ ok: true }>("/api/order-status", { orderId, status });
}
