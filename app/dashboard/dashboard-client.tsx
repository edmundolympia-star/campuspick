"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { activeOrders, loadState, remainingForItem, updateOrderStatus } from "@/lib/demo-store";
import { formatMoney } from "@/lib/demo-data";
import { fetchCloudState, updateCloudOrderStatus } from "@/lib/cloud-client";
import { addDaysToDateString, formatPickupDate, nextPickupDate, todayInPickupZone } from "@/lib/order-dates";
import type { DemoState, OrderStatus } from "@/lib/types";

const statuses: Array<"all" | OrderStatus> = ["all", "pending", "ready", "collected", "cancelled"];

export function DashboardClient() {
  const [state, setState] = useState<DemoState>(() => loadState());
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [time, setTime] = useState("all");
  const [date, setDate] = useState(() => nextPickupDate());
  const [notice, setNotice] = useState("");
  const [cloudMode, setCloudMode] = useState(false);

  useEffect(() => {
    const refresh = () => setState(loadState());
    window.addEventListener("campuspick-state", refresh);
    fetchCloudState()
      .then((result) => {
        if (result.mode === "cloud") {
          setCloudMode(true);
          setState(result.state);
        }
      })
      .catch(() => undefined);
    return () => window.removeEventListener("campuspick-state", refresh);
  }, []);

  const vendor = state.vendors[0];
  const dateOptions = useMemo(() => {
    const today = todayInPickupZone();
    const base = [today, addDaysToDateString(today, 1), addDaysToDateString(today, 2), addDaysToDateString(today, 3)];
    const fromOrders = state.orders.filter((order) => order.vendorId === vendor.id).map((order) => order.pickupDate);
    return Array.from(new Set([...base, ...fromOrders])).sort();
  }, [state.orders, vendor.id]);
  const orders = state.orders
    .filter((order) => order.vendorId === vendor.id)
    .filter((order) => order.pickupDate === date)
    .filter((order) => status === "all" || order.status === status)
    .filter((order) => time === "all" || order.pickupTime === time)
    .sort((a, b) => a.pickupTime.localeCompare(b.pickupTime) || a.orderNumber.localeCompare(b.orderNumber));
  const active = activeOrders(state, vendor.id, date);
  const itemsReserved = active.flatMap((order) => order.items).reduce((sum, line) => sum + line.quantity, 0);
  const revenue = active.reduce((sum, order) => sum + order.totalAmount, 0);
  const remaining = state.menuItems.filter((item) => item.vendorId === vendor.id).reduce((sum, item) => sum + remainingForItem(state, item, date), 0);
  const times = useMemo(() => ["all", ...state.pickupSlots.filter((slot) => slot.vendorId === vendor.id).map((slot) => slot.pickupTime)], [state, vendor.id]);
  const publicUrl = typeof window === "undefined" ? `/vendor/${vendor.slug}` : `${window.location.origin}/vendor/${vendor.slug}`;

  async function setOrderStatus(orderId: string, nextStatus: OrderStatus) {
    if (cloudMode) {
      await updateCloudOrderStatus(orderId, nextStatus);
      const result = await fetchCloudState(vendor.slug);
      if (result.mode === "cloud") setState(result.state);
    } else {
      updateOrderStatus(orderId, nextStatus);
      setState(loadState());
    }
    setNotice(`Order marked ${nextStatus}.`);
    window.setTimeout(() => setNotice(""), 2200);
  }

  function downloadQr() {
    const svg = document.querySelector("#vendor-qr")?.outerHTML;
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${vendor.slug}-qr.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("QR downloaded.");
    window.setTimeout(() => setNotice(""), 2200);
  }

  return (
    <div className="space-y-5">
      {notice && <div className="fixed right-4 top-4 z-50 rounded-full bg-ink px-5 py-3 text-sm font-black text-paper shadow-soft">{notice}</div>}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Date Orders", String(active.length)],
          ["Items Reserved", String(itemsReserved)],
          ["Remaining Stock", String(remaining)],
          ["Preorder Revenue", formatMoney(revenue)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-[28px] bg-paper p-5 shadow-sm">
            <p className="text-sm font-semibold text-neutral-500">{label}</p>
            <strong className="mt-2 block text-3xl font-black">{value}</strong>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-[28px] bg-paper p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black">Today&apos;s Orders</h1>
              <p className="text-sm text-neutral-500">{formatPickupDate(date)} orders, sorted by pickup time.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select className="tap rounded-full border border-line bg-white px-3 text-sm font-bold" value={date} onChange={(event) => setDate(event.target.value)}>
                {dateOptions.map((option) => <option key={option} value={option}>{formatPickupDate(option)}</option>)}
              </select>
              <select className="tap rounded-full border border-line bg-white px-3 text-sm font-bold" value={time} onChange={(event) => setTime(event.target.value)}>
                {times.map((slot) => <option key={slot} value={slot}>{slot === "all" ? "All times" : slot}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {statuses.map((item) => (
              <button key={item} onClick={() => setStatus(item)} className={`tap rounded-full px-4 text-sm font-bold capitalize ${status === item ? "bg-ink text-paper" : "bg-mist text-neutral-600"}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {orders.length === 0 && <p className="rounded-3xl bg-mist p-5 text-neutral-500">No orders yet. Place one from the student page to see it here.</p>}
            {orders.map((order) => (
              <article key={order.id} className="rounded-3xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xl">{order.pickupTime}</strong>
                      <span className="rounded-full bg-mist px-3 py-1 text-sm font-black">{order.orderNumber}</span>
                    </div>
                    <p className="mt-2 font-bold">{order.customerName}</p>
                    <p className="text-sm text-neutral-500">Phone ending {order.phoneLast4}</p>
                  </div>
                  <span className="rounded-full bg-wasabi px-3 py-1 text-sm font-black capitalize">{order.status}</span>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-3">
                      <span>{item.itemName} ×{item.quantity}</span>
                      <strong>{formatMoney(item.unitPrice * item.quantity)}</strong>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <strong>{formatMoney(order.totalAmount)}</strong>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void setOrderStatus(order.id, "ready")} className="tap rounded-full bg-ink px-4 text-sm font-bold text-paper">Ready</button>
                    <button onClick={() => void setOrderStatus(order.id, "collected")} className="tap rounded-full bg-matcha px-4 text-sm font-bold text-white">Collected</button>
                    <button onClick={() => void setOrderStatus(order.id, "cancelled")} className="tap rounded-full bg-tomato px-4 text-sm font-bold text-white">Cancel</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-[28px] bg-ink p-5 text-paper shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <QrCode />
            <h2 className="text-xl font-black">Vendor QR</h2>
          </div>
          <div className="rounded-3xl bg-white p-4">
            <QRCodeSVG id="vendor-qr" value={publicUrl} className="h-full w-full" />
          </div>
          <p className="mt-3 break-all text-sm text-neutral-300">{publicUrl}</p>
          <button onClick={downloadQr} className="tap mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-paper px-4 font-black text-ink">
            <Download size={18} /> Download QR
          </button>
          <Link href="/dashboard/qr" className="tap mt-3 flex w-full items-center justify-center rounded-full bg-white/10 px-4 font-black text-paper">
            Print poster
          </Link>
        </aside>
      </section>
    </div>
  );
}
