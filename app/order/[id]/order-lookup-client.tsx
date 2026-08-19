"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { findOrder, loadState } from "@/lib/demo-store";
import { formatMoney } from "@/lib/demo-data";
import type { Order, Vendor } from "@/lib/types";

export function OrderLookupClient({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [vendor, setVendor] = useState<Vendor | undefined>();

  useEffect(() => {
    const found = findOrder(id);
    const state = loadState();
    setOrder(found);
    setVendor(found ? state.vendors.find((item) => item.id === found.vendorId) : state.vendors[0]);
  }, [id]);

  if (order === undefined) {
    return (
      <main className="phone-shell grid place-items-center px-5 text-ink">
        <p className="font-bold text-neutral-500">正在读取订单...</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="phone-shell grid place-items-center px-5 text-ink">
        <section className="rounded-[28px] bg-white p-6 text-center shadow-soft">
          <h1 className="text-2xl font-black">找不到订单</h1>
          <p className="mt-2 text-sm text-neutral-500">此 demo 订单只保存在本机浏览器和当天记录中。</p>
          <Link href="/vendor/riceball-campus" className="tap mt-5 inline-flex items-center rounded-full bg-ink px-5 font-black text-paper">重新下单</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="phone-shell px-5 py-6 text-ink">
      <p className="text-sm font-bold text-matcha">订单详情</p>
      <h1 className="text-4xl font-black">{order.orderNumber}</h1>
      <section className="mt-5 rounded-[28px] bg-white p-5 shadow-soft">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-mist p-3">
            <p className="text-neutral-500">状态</p>
            <strong className="capitalize">{order.status}</strong>
          </div>
          <div className="rounded-2xl bg-mist p-3">
            <p className="text-neutral-500">取餐时间</p>
            <strong>{order.pickupTime}</strong>
          </div>
        </div>
        <div className="space-y-3 py-5">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4">
              <span>{item.chineseName} ×{item.quantity}</span>
              <strong>{formatMoney(item.quantity * item.unitPrice)}</strong>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-line pt-4 text-lg">
          <span>Total</span>
          <strong>{formatMoney(order.totalAmount)}</strong>
        </div>
        <p className="mt-3 text-sm text-neutral-500">Phone ending {order.phoneLast4}</p>
      </section>
      {order.paymentMethod === "duitnow" && (
        <section className="mt-4 rounded-[28px] bg-ink p-5 text-paper">
          <h2 className="mb-2 text-lg font-black">DuitNow QR</h2>
          <div className="rounded-3xl bg-white p-4">
            {vendor?.duitnowQrUrl ? (
              <img src={vendor.duitnowQrUrl} alt="DuitNow QR" className="aspect-square w-full rounded-2xl object-cover" />
            ) : (
              <QRCodeSVG value={`CampusPick ${order.orderNumber} ${formatMoney(order.totalAmount)}`} className="h-full w-full" />
            )}
          </div>
          <p className="mt-3 text-sm text-neutral-300">请完成付款，并在取餐时出示付款记录。</p>
        </section>
      )}
      <Link href={`/vendor/${vendor?.slug ?? "riceball-campus"}`} className="tap mt-5 flex w-full items-center justify-center rounded-full bg-ink px-5 py-4 font-bold text-paper">返回菜单</Link>
    </main>
  );
}
