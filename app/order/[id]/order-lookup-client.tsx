"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { cancelOrder, findOrder, loadState } from "@/lib/demo-store";
import { formatMoney } from "@/lib/demo-data";
import { cancelCloudOrder, lookupCloudOrder } from "@/lib/cloud-client";
import type { Order, Vendor } from "@/lib/types";

export function OrderLookupClient({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [vendor, setVendor] = useState<Vendor | undefined>();
  const [phoneLast4, setPhoneLast4] = useState("");
  const [message, setMessage] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    lookupCloudOrder({ orderId: id })
      .then((result) => {
        setOrder(result.order);
        setVendor(result.vendor);
      })
      .catch(() => {
        const found = findOrder(id);
        const state = loadState();
        setOrder(found);
        setVendor(found ? state.vendors.find((item) => item.id === found.vendorId) : state.vendors[0]);
      });
  }, [id]);

  const canCancel = Boolean(order && order.status === "pending" && Date.now() - new Date(order.createdAt).getTime() <= 30 * 60 * 1000);
  const minutesLeft = order ? Math.max(0, Math.ceil((30 * 60 * 1000 - (Date.now() - new Date(order.createdAt).getTime())) / 60000)) : 0;

  async function cancel() {
    if (!order || cancelling) return;
    setMessage("");
    if (!/^\d{4}$/.test(phoneLast4)) {
      setMessage("请输入下单时的手机号码最后 4 位。");
      return;
    }
    setCancelling(true);
    try {
      try {
        await cancelCloudOrder(order.id, phoneLast4);
      } catch {
        cancelOrder(order.id, phoneLast4);
      }
      setOrder({ ...order, status: "cancelled" });
      setMessage("订单已取消。");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "取消失败，请重试。");
    } finally {
      setCancelling(false);
    }
  }

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
          <p className="mt-2 text-sm text-neutral-500">请检查订单链接，或用订单号和手机后 4 位查询。</p>
          <Link href="/order" className="tap mt-5 inline-flex items-center rounded-full bg-mist px-5 py-3 font-black text-ink">查询订单</Link>
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
      <section className="mt-4 rounded-[28px] bg-white p-5 shadow-soft">
        <h2 className="text-lg font-black">取消订单</h2>
        <p className="mt-2 text-sm text-neutral-500">
          {order.status === "pending"
            ? canCancel
              ? `下单后 30 分钟内可取消，还剩约 ${minutesLeft} 分钟。`
              : "已超过 30 分钟，不能自助取消。"
            : "这个订单已经不是 pending 状态，不能自助取消。"}
        </p>
        {canCancel && (
          <div className="mt-4 space-y-3">
            <input
              className="tap w-full rounded-2xl border border-line bg-white px-4 outline-none focus:border-ink"
              placeholder="手机号码最后 4 位"
              inputMode="numeric"
              maxLength={4}
              value={phoneLast4}
              onChange={(event) => setPhoneLast4(event.target.value.replace(/\D/g, ""))}
            />
            <button onClick={() => void cancel()} disabled={cancelling} className="tap w-full rounded-full bg-tomato px-5 py-4 font-bold text-white disabled:opacity-50">
              {cancelling ? "正在取消..." : "取消订单"}
            </button>
          </div>
        )}
        {message && <p className="mt-3 rounded-2xl bg-mist px-4 py-3 text-sm font-bold">{message}</p>}
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
      <Link href="/order" className="tap mt-5 flex w-full items-center justify-center rounded-full bg-mist px-5 py-4 font-bold text-ink">查询其他订单</Link>
      <Link href={`/vendor/${vendor?.slug ?? "riceball-campus"}`} className="tap mt-5 flex w-full items-center justify-center rounded-full bg-ink px-5 py-4 font-bold text-paper">返回菜单</Link>
    </main>
  );
}
