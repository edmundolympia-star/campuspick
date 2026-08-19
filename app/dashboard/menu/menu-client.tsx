"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteMenuItem, loadState, remainingForItem, upsertMenuItem } from "@/lib/demo-store";
import { formatMoney } from "@/lib/demo-data";
import { compressImage } from "@/lib/image-utils";
import { deleteCloudMenuItem, fetchCloudState, saveCloudMenuItem, uploadCloudImage } from "@/lib/cloud-client";
import { formatPickupDate, nextPickupDate } from "@/lib/order-dates";
import type { DemoState, MenuItem } from "@/lib/types";

const blank = (vendorId: string): MenuItem => ({
  id: crypto.randomUUID(),
  vendorId,
  name: "",
  chineseName: "",
  description: "",
  price: 0,
  dailyStock: 0,
  available: true,
  imageUrl: ""
});

export function MenuClient() {
  const [state, setState] = useState<DemoState>(() => loadState());
  const vendor = state.vendors[0];
  const [editing, setEditing] = useState<MenuItem>(() => blank(vendor.id));
  const [notice, setNotice] = useState("");
  const [cloudMode, setCloudMode] = useState(false);
  const pickupDate = nextPickupDate();

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

  const items = state.menuItems.filter((item) => item.vendorId === vendor.id);

  async function refreshCloud() {
    const result = await fetchCloudState();
    if (result.mode === "cloud") setState(result.state);
  }

  async function save() {
    if (!editing.name || !editing.chineseName) return;
    try {
      if (cloudMode) {
        await saveCloudMenuItem(editing);
        await refreshCloud();
      } else {
        upsertMenuItem(editing);
        setState(loadState());
      }
      setEditing(blank(vendor.id));
      setNotice("Menu item saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save. Try a smaller photo.");
    }
    window.setTimeout(() => setNotice(""), 2600);
  }

  async function readImage(file: File, onDone: (value: string) => void) {
    try {
      setNotice("Preparing photo...");
      const compressed = await compressImage(file, 900, 0.78);
      if (cloudMode) {
        const { publicUrl } = await uploadCloudImage(compressed, "menu");
        onDone(publicUrl);
      } else {
        onDone(compressed);
      }
      setNotice("Photo ready. Save the item.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not read this photo.");
    }
    window.setTimeout(() => setNotice(""), 2600);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      {notice && <div className="fixed right-4 top-4 z-50 rounded-full bg-ink px-5 py-3 text-sm font-black text-paper shadow-soft">{notice}</div>}
      <section className="rounded-[28px] bg-paper p-5 shadow-sm">
        <h1 className="text-2xl font-black">{items.some((item) => item.id === editing.id) ? "Edit item" : "Create item"}</h1>
        <div className="mt-4 space-y-3">
          <input className="tap w-full rounded-2xl border border-line bg-white px-4" placeholder="Item name" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
          <input className="tap w-full rounded-2xl border border-line bg-white px-4" placeholder="Chinese name" value={editing.chineseName} onChange={(event) => setEditing({ ...editing, chineseName: event.target.value })} />
          <textarea className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="Description" value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold text-neutral-500">Price
              <input className="tap mt-1 w-full rounded-2xl border border-line bg-white px-4 text-ink" type="number" step="0.1" value={editing.price} onChange={(event) => setEditing({ ...editing, price: Number(event.target.value) })} />
            </label>
            <label className="text-sm font-bold text-neutral-500">Daily stock
              <input className="tap mt-1 w-full rounded-2xl border border-line bg-white px-4 text-ink" type="number" value={editing.dailyStock} onChange={(event) => setEditing({ ...editing, dailyStock: Number(event.target.value) })} />
            </label>
          </div>
          <div className="rounded-3xl border border-line bg-white p-3">
            {editing.imageUrl ? (
              <img src={editing.imageUrl} alt="Menu item preview" className="mb-3 h-40 w-full rounded-2xl object-cover" />
            ) : (
              <div className="mb-3 grid h-40 place-items-center rounded-2xl bg-mist text-sm font-bold text-neutral-500">No photo</div>
            )}
            <label className="block text-sm font-bold text-neutral-500">Upload item photo
              <input
                className="mt-2 block w-full text-sm"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readImage(file, (imageUrl) => setEditing((current) => ({ ...current, imageUrl })));
                }}
              />
            </label>
            <input className="tap mt-3 w-full rounded-2xl border border-line bg-white px-4" placeholder="Or paste image URL" value={editing.imageUrl ?? ""} onChange={(event) => setEditing({ ...editing, imageUrl: event.target.value })} />
          </div>
          <label className="flex items-center justify-between rounded-2xl bg-mist px-4 py-3 font-bold">
            Available
            <input type="checkbox" checked={editing.available} onChange={(event) => setEditing({ ...editing, available: event.target.checked })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button className="tap rounded-full bg-ink px-4 font-black text-paper" onClick={() => void save()}>Save item</button>
            <button className="tap rounded-full bg-mist px-4 font-black" onClick={() => setEditing(blank(vendor.id))}>New</button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] bg-paper p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">Menu</h2>
            <p className="text-sm text-neutral-500">Set stock, price, availability, and sold-out status for {formatPickupDate(pickupDate)}.</p>
          </div>
          <button onClick={() => setEditing(blank(vendor.id))} className="tap rounded-full bg-ink px-4 text-paper"><Plus size={18} /></button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => {
            const remaining = remainingForItem(state, item, pickupDate);
            return (
              <article key={item.id} className="rounded-3xl border border-line bg-white p-4">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="mb-3 h-28 w-full rounded-3xl object-cover" />
                ) : (
                  <div className="mb-3 h-28 rounded-3xl bg-wasabi/70" />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{item.name}</h3>
                    <p className="text-sm text-neutral-500">{item.chineseName}</p>
                  </div>
                  <strong>{formatMoney(item.price)}</strong>
                </div>
                <p className="mt-3 text-sm text-neutral-600">{item.description}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <span className="rounded-2xl bg-mist px-3 py-2 font-bold">Stock {item.dailyStock}</span>
                  <span className="rounded-2xl bg-mist px-3 py-2 font-bold">Left {remaining}</span>
                  <span className={`rounded-2xl px-3 py-2 font-bold ${item.available && remaining > 0 ? "bg-wasabi" : "bg-tomato/20 text-tomato"}`}>{item.available && remaining > 0 ? "Live" : "Sold out"}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setEditing(item)} className="tap flex-1 rounded-full bg-ink px-4 font-bold text-paper">Edit</button>
                  <button
                    onClick={async () => {
                      if (cloudMode) {
                        await deleteCloudMenuItem(item.id);
                        await refreshCloud();
                      } else {
                        deleteMenuItem(item.id);
                        setState(loadState());
                      }
                      setNotice("Menu item deleted.");
                      window.setTimeout(() => setNotice(""), 2200);
                    }}
                    className="tap rounded-full bg-tomato px-4 text-white"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
