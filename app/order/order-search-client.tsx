"use client";

import Link from "next/link";
import { useState } from "react";
import { findOrderByNumber, loadState } from "@/lib/demo-store";
import { lookupCloudOrder } from "@/lib/cloud-client";
import { formatMoney } from "@/lib/demo-data";
import { formatPickupDate } from "@/lib/order-dates";
import type { Order, Vendor } from "@/lib/types";

export function OrderSearchClient() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [vendor, setVendor] = useState<Vendor | undefined>();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function search() {
    setMessage("");
    setOrder(null);
    if (!orderNumber.trim()) return setMessage("请输入订单号。");
    if (!/^\d{4}$/.test(phoneLast4)) return setMessage("请输入手机号码最后 4 位。");
    setLoading(true);
    try {
      try {
        const result = await lookupCloudOrder({ orderNumber, phoneLast4 });
        setOrder(result.order);
        setVendor(result.vendor);
        return;
      } catch {
        const found = findOrderByNumber(orderNumber, phoneLast4);
        if (!found) throw new Error("找不到订单，请检查订单号和手机后 4 位。");
        const state = loadState();
        setOrder(found);
        setVendor(state.vendors.find((item) => item.id === found.vendorId));
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "查询失败，请重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="phone-shell px-5 py-6 text-ink">
      <p className="text-sm font-bold text-matcha">CampusPick</p>
      <h1 className="text-4xl font-black">查询订单</h1>
      <section className="mt-5 space-y-3 rounded-[28px] bg-white p-5 shadow-soft">
        <input
          className="tap w-full rounded-2xl border border-line bg-white px-4 outline-none focus:border-ink"
          placeholder="订单号，例如 RB001"
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
        />
        <input
          className="tap w-full rounded-2xl border border-line bg-white px-4 outline-none focus:border-ink"
          placeholder="手机号码最后 4 位"
          inputMode="numeric"
          maxLength={4}
          value={phoneLast4}
          onChange={(event) => setPhoneLast4(event.target.value.replace(/\D/g, ""))}
        />
        <button onClick={() => void search()} disabled={loading} className="tap w-full rounded-full bg-ink px-5 py-4 font-black text-paper disabled:opacity-50">
          {loading ? "正在查询..." : "查询订单"}
        </button>
        {message && <p className="rounded-2xl bg-tomato/10 px-4 py-3 text-sm font-bold text-tomato">{message}</p>}
      </section>

      {order && (
        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-500">{vendor?.name ?? "CampusPick"}</p>
              <h2 className="text-3xl font-black">{order.orderNumber}</h2>
            </div>
            <span className="rounded-full bg-wasabi px-3 py-1 text-sm font-black capitalize">{order.status}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-mist p-3">
              <p className="text-neutral-500">取餐时间</p>
              <strong>{formatPickupDate(order.pickupDate)} {order.pickupTime}</strong>
            </div>
            <div className="rounded-2xl bg-mist p-3">
              <p className="text-neutral-500">金额</p>
              <strong>{formatMoney(order.totalAmount)}</strong>
            </div>
          </div>
          <Link href={`/order/${order.id}`} className="tap mt-4 flex w-full items-center justify-center rounded-full bg-ink px-5 py-4 font-bold text-paper">
            查看详情 / 取消订单
          </Link>
        </section>
      )}

      <Link href="/vendor/riceball-campus" className="tap mt-5 flex w-full items-center justify-center rounded-full bg-mist px-5 py-4 font-bold text-ink">返回菜单</Link>
    </main>
  );
}
