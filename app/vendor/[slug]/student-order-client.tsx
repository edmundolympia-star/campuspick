"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createOrder, loadState, remainingForItem, slotUsed } from "@/lib/demo-store";
import { formatMoney } from "@/lib/demo-data";
import { createCloudOrder, fetchCloudState } from "@/lib/cloud-client";
import { formatPickupDate, nextPickupDate, pickupCutoffLabel } from "@/lib/order-dates";
import type { DemoState, Order, PaymentMethod } from "@/lib/types";

export function StudentOrderClient({ slug }: { slug: string }) {
  const [state, setState] = useState<DemoState>(() => loadState());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pickupTime, setPickupTime] = useState("12:00");
  const [customerName, setCustomerName] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pickup");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cloudMode, setCloudMode] = useState(false);

  useEffect(() => {
    const refresh = () => setState(loadState());
    window.addEventListener("campuspick-state", refresh);
    fetchCloudState(slug)
      .then((result) => {
        if (result.mode === "cloud") {
          setCloudMode(true);
          setState(result.state);
        }
      })
      .catch(() => undefined);
    return () => window.removeEventListener("campuspick-state", refresh);
  }, [slug]);

  const vendor = state.vendors.find((item) => item.slug === slug) ?? state.vendors[0];
  const pickupDate = nextPickupDate();
  const menu = state.menuItems.filter((item) => item.vendorId === vendor.id && item.available);
  const slots = state.pickupSlots.filter((item) => item.vendorId === vendor.id && item.active);
  const remainingTotal = menu.reduce((sum, item) => sum + remainingForItem(state, item, pickupDate), 0);
  const paused = Boolean(vendor.paused);
  const total = useMemo(
    () => menu.reduce((sum, item) => sum + (quantities[item.id] ?? 0) * item.price, 0),
    [menu, quantities]
  );
  const selectedCount = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);

  function changeQuantity(itemId: string, next: number, max: number) {
    setQuantities((current) => ({ ...current, [itemId]: Math.max(0, Math.min(next, max)) }));
  }

  async function submitOrder() {
    if (submitting) return;
    setError("");
    if (!customerName.trim()) return setError("请输入姓名。");
    if (!/^\d{4}$/.test(phoneLast4)) return setError("请输入手机号码最后 4 位数字。");
    setSubmitting(true);
    try {
      if (cloudMode) {
        const created = await createCloudOrder({
          vendorSlug: vendor.slug,
          quantities,
          pickupTime,
          customerName: customerName.trim(),
          phoneLast4,
          paymentMethod
        });
        const result = await fetchCloudState(vendor.slug);
        if (result.mode === "cloud") {
          setState(result.state);
          setOrder(result.state.orders.find((item) => item.id === created.orderId) ?? result.state.orders.find((item) => item.orderNumber === created.orderNumber) ?? null);
        }
      } else {
        const newOrder = createOrder({
          vendorId: vendor.id,
          quantities,
          pickupTime,
          customerName: customerName.trim(),
          phoneLast4,
          paymentMethod
        });
        setOrder(newOrder);
        setState(loadState());
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "预订失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <main className="phone-shell px-5 py-6 text-ink">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-matcha">预订成功</p>
            <h1 className="text-4xl font-black">{order.orderNumber}</h1>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-full bg-wasabi">
            <ShoppingBag />
          </div>
        </div>
        <section className="rounded-[28px] bg-white p-5 shadow-soft">
          <div className="flex justify-between border-b border-line pb-4">
            <span className="text-neutral-500">取餐日期 / 时间</span>
            <strong>{formatPickupDate(order.pickupDate)} {order.pickupTime}</strong>
          </div>
          <div className="space-y-3 py-4">
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
          <p className="mt-2 text-sm font-bold text-matcha">下单后 30 分钟内可在订单详情页取消。</p>
        </section>
        {order.paymentMethod === "duitnow" && (
          <section className="mt-4 rounded-[28px] bg-ink p-5 text-paper">
            <h2 className="mb-2 text-lg font-black">DuitNow QR</h2>
            <div className="rounded-3xl bg-white p-4">
              {vendor.duitnowQrUrl ? (
                <img src={vendor.duitnowQrUrl} alt="DuitNow QR" className="aspect-square w-full rounded-2xl object-cover" />
              ) : (
                <QRCodeSVG value={`CampusPick ${order.orderNumber} ${formatMoney(order.totalAmount)}`} className="h-full w-full" />
              )}
            </div>
            <p className="mt-3 text-sm text-neutral-300">请完成付款，并在取餐时出示付款记录。</p>
          </section>
        )}
        <button
          className="tap mt-5 w-full rounded-full bg-ink px-5 py-4 font-bold text-paper"
          onClick={() => {
            setOrder(null);
            setQuantities({});
          }}
        >
          再下一单
        </button>
        <Link href={`/order/${order.id}`} className="tap mt-3 flex w-full items-center justify-center rounded-full bg-mist px-5 py-4 font-bold text-ink">
          查看订单详情 / 取消订单
        </Link>
        <Link href="/order" className="tap mt-3 flex w-full items-center justify-center rounded-full bg-white px-5 py-4 font-bold text-ink shadow-sm">
          查询其他订单
        </Link>
      </main>
    );
  }

  return (
    <main className="phone-shell text-ink">
      <header className="px-5 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <span className="text-lg font-black">CampusPick</span>
          <div className="flex items-center gap-2">
            <Link href="/order" className="tap rounded-full bg-white px-3 py-2 text-sm font-black shadow-sm">
              查订单
            </Link>
            <span className="rounded-full bg-wasabi px-3 py-1 text-sm font-bold">剩余 {remainingTotal} 份</span>
          </div>
        </div>
        <section className="mt-5 rounded-[32px] bg-ink p-6 text-paper">
          {vendor.logoUrl && <img src={vendor.logoUrl} alt={vendor.name} className="mb-5 h-36 w-full rounded-3xl object-cover" />}
          <p className="text-sm text-neutral-300">{vendor.name}</p>
          <h1 className="mt-3 text-3xl font-black leading-tight">预订 {formatPickupDate(pickupDate)} 取餐</h1>
          <p className="mt-3 text-sm text-neutral-300">{pickupCutoffLabel()}；超过 6 点自动预订后天。</p>
          <p className="mt-2 text-sm text-neutral-300">{vendor.subtext}</p>
          {vendor.description && vendor.description !== vendor.heroMessage && <p className="mt-3 text-sm text-neutral-400">{vendor.description}</p>}
        </section>
        {paused && (
          <section className="mt-4 rounded-[28px] bg-tomato/10 p-5 text-tomato">
            <h2 className="text-lg font-black">暂时停止接单</h2>
            <p className="mt-2 text-sm font-bold">{vendor.pauseMessage || "今天暂时停止接单。"}</p>
          </section>
        )}
      </header>

      <section className="px-5">
        <h2 className="mb-3 text-lg font-black">今日菜单</h2>
        <div className="space-y-3">
          {menu.map((item, index) => {
            const remaining = remainingForItem(state, item, pickupDate);
            const quantity = quantities[item.id] ?? 0;
            return (
              <article key={item.id} className="flex gap-3 rounded-[28px] bg-white p-4 shadow-sm">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-24 w-24 shrink-0 rounded-3xl object-cover" />
                ) : (
                  <div className={`h-24 w-24 shrink-0 rounded-3xl ${index === 0 ? "bg-wasabi" : index === 1 ? "bg-tomato/20" : "bg-matcha/20"}`} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black leading-tight">{item.chineseName}</h3>
                      <p className="text-xs text-neutral-500">{item.name}</p>
                    </div>
                    <strong>{formatMoney(item.price)}</strong>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-sm font-bold ${remaining === 0 ? "text-tomato" : "text-matcha"}`}>剩余 {remaining}</span>
                    <div className="grid h-11 grid-cols-[44px_36px_44px] overflow-hidden rounded-xl border border-line bg-white">
                      <button aria-label="minus" className="grid place-items-center border-r border-line text-xl font-black disabled:text-neutral-300" disabled={quantity === 0} onClick={() => changeQuantity(item.id, quantity - 1, remaining)}>
                        -
                      </button>
                      <span className="grid place-items-center text-sm font-black">{quantity}</span>
                      <button aria-label="plus" className="grid place-items-center border-l border-line bg-ink text-xl font-black text-paper disabled:bg-white disabled:text-neutral-300" disabled={quantity >= remaining} onClick={() => changeQuantity(item.id, quantity + 1, remaining)}>
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="px-5 py-5">
        <h2 className="mb-3 text-lg font-black">取餐时间</h2>
        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot) => {
            const full = slotUsed(state, slot, pickupDate) >= slot.maxOrders;
            return (
              <button
                key={slot.id}
                disabled={full}
                onClick={() => setPickupTime(slot.pickupTime)}
                className={`tap rounded-2xl border px-3 py-3 text-sm font-black ${pickupTime === slot.pickupTime ? "border-ink bg-ink text-paper" : "border-line bg-white"} disabled:bg-line disabled:text-neutral-400`}
              >
                {slot.pickupTime}
                <span className="block text-xs font-semibold">{full ? "已满" : `${slot.maxOrders - slotUsed(state, slot, pickupDate)} 位`}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 px-5 pb-32">
        <input className="tap w-full rounded-2xl border border-line bg-white px-4 outline-none focus:border-ink" placeholder="姓名" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
        <input className="tap w-full rounded-2xl border border-line bg-white px-4 outline-none focus:border-ink" placeholder="手机号码最后 4 位" inputMode="numeric" maxLength={4} value={phoneLast4} onChange={(event) => setPhoneLast4(event.target.value.replace(/\D/g, ""))} />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setPaymentMethod("pickup")} className={`tap rounded-2xl border px-3 font-bold ${paymentMethod === "pickup" ? "border-ink bg-ink text-paper" : "border-line bg-white"}`}>取餐现金付款</button>
          <button onClick={() => setPaymentMethod("duitnow")} className={`tap rounded-2xl border px-3 font-bold ${paymentMethod === "duitnow" ? "border-ink bg-ink text-paper" : "border-line bg-white"}`}>DuitNow QR</button>
        </div>
        {error && <p className="rounded-2xl bg-tomato/10 px-4 py-3 text-sm font-bold text-tomato">{error}</p>}
      </section>

      <footer className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-[460px] border-t border-line bg-paper/95 px-5 py-4 backdrop-blur">
        <button disabled={!selectedCount || submitting || paused} onClick={() => void submitOrder()} className="tap flex w-full items-center justify-between rounded-full bg-ink px-5 py-4 font-black text-paper disabled:opacity-40">
          <span>{paused ? "暂时停止接单" : submitting ? "正在提交..." : `确认预订 · ${selectedCount} 份`}</span>
          <span>{formatMoney(total)}</span>
        </button>
      </footer>
    </main>
  );
}
