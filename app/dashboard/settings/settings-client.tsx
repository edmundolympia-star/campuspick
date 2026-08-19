"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deletePickupSlot, loadState, slotUsed, updateVendor, upsertPickupSlot } from "@/lib/demo-store";
import type { DemoState, PickupSlot, Vendor } from "@/lib/types";

export function SettingsClient() {
  const [state, setState] = useState<DemoState>(() => loadState());
  const vendor = state.vendors[0];
  const [vendorDraft, setVendorDraft] = useState<Vendor>(vendor);
  const [time, setTime] = useState("");
  const [maxOrders, setMaxOrders] = useState(20);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const refresh = () => setState(loadState());
    window.addEventListener("campuspick-state", refresh);
    return () => window.removeEventListener("campuspick-state", refresh);
  }, []);

  useEffect(() => {
    setVendorDraft(vendor);
  }, [vendor]);

  const slots = state.pickupSlots.filter((slot) => slot.vendorId === vendor.id);

  function saveSlot(slot: PickupSlot) {
    upsertPickupSlot(slot);
    setState(loadState());
    setNotice("Pickup slot saved.");
    window.setTimeout(() => setNotice(""), 2200);
  }

  function saveVendor() {
    updateVendor({
      ...vendorDraft,
      slug: vendorDraft.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || vendor.slug
    });
    setState(loadState());
    setNotice("Vendor info saved.");
    window.setTimeout(() => setNotice(""), 2200);
  }

  function readImage(file: File, onDone: (value: string) => void) {
    const reader = new FileReader();
    reader.onload = () => onDone(String(reader.result));
    reader.readAsDataURL(file);
  }

  function addSlot() {
    if (!time) return;
    saveSlot({ id: crypto.randomUUID(), vendorId: vendor.id, pickupTime: time, maxOrders, active: true });
    setTime("");
    setMaxOrders(20);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      {notice && <div className="fixed right-4 top-4 z-50 rounded-full bg-ink px-5 py-3 text-sm font-black text-paper shadow-soft">{notice}</div>}
      <section className="space-y-5">
        <div className="rounded-[28px] bg-paper p-5 shadow-sm">
          <h1 className="text-2xl font-black">Vendor info</h1>
          <p className="mt-1 text-sm text-neutral-500">Edit the public student page and payment QR.</p>
          <div className="mt-5 space-y-3">
            <input className="tap w-full rounded-2xl border border-line bg-white px-4" placeholder="Vendor name" value={vendorDraft.name} onChange={(event) => setVendorDraft({ ...vendorDraft, name: event.target.value })} />
            <input className="tap w-full rounded-2xl border border-line bg-white px-4" placeholder="URL slug" value={vendorDraft.slug} onChange={(event) => setVendorDraft({ ...vendorDraft, slug: event.target.value })} />
            <input className="tap w-full rounded-2xl border border-line bg-white px-4" placeholder="Hero message" value={vendorDraft.heroMessage} onChange={(event) => setVendorDraft({ ...vendorDraft, heroMessage: event.target.value })} />
            <input className="tap w-full rounded-2xl border border-line bg-white px-4" placeholder="Subtext" value={vendorDraft.subtext} onChange={(event) => setVendorDraft({ ...vendorDraft, subtext: event.target.value })} />
            <textarea className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3" placeholder="Description" value={vendorDraft.description} onChange={(event) => setVendorDraft({ ...vendorDraft, description: event.target.value })} />

            <div className="rounded-3xl border border-line bg-white p-3">
              {vendorDraft.logoUrl ? (
                <img src={vendorDraft.logoUrl} alt="Vendor logo preview" className="mb-3 h-36 w-full rounded-2xl object-cover" />
              ) : (
                <div className="mb-3 grid h-36 place-items-center rounded-2xl bg-mist text-sm font-bold text-neutral-500">No vendor photo</div>
              )}
              <label className="block text-sm font-bold text-neutral-500">Upload vendor photo/logo
                <input
                  className="mt-2 block w-full text-sm"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) readImage(file, (logoUrl) => setVendorDraft((current) => ({ ...current, logoUrl })));
                  }}
                />
              </label>
            </div>

            <div className="rounded-3xl border border-line bg-white p-3">
              {vendorDraft.duitnowQrUrl ? (
                <img src={vendorDraft.duitnowQrUrl} alt="DuitNow QR preview" className="mb-3 aspect-square w-full rounded-2xl object-cover" />
              ) : (
                <div className="mb-3 grid aspect-square place-items-center rounded-2xl bg-mist text-sm font-bold text-neutral-500">No DuitNow QR</div>
              )}
              <label className="block text-sm font-bold text-neutral-500">Upload DuitNow QR
                <input
                  className="mt-2 block w-full text-sm"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) readImage(file, (duitnowQrUrl) => setVendorDraft((current) => ({ ...current, duitnowQrUrl })));
                  }}
                />
              </label>
            </div>

            <button onClick={saveVendor} className="tap flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 font-black text-paper"><Save size={18} /> Save vendor info</button>
          </div>
        </div>

        <div className="rounded-[28px] bg-paper p-5 shadow-sm">
          <h2 className="text-2xl font-black">Add pickup slot</h2>
          <p className="mt-1 text-sm text-neutral-500">Define pickup windows and maximum active orders.</p>
        <div className="mt-5 space-y-3">
          <input className="tap w-full rounded-2xl border border-line bg-white px-4" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          <label className="text-sm font-bold text-neutral-500">Maximum orders
            <input className="tap mt-1 w-full rounded-2xl border border-line bg-white px-4 text-ink" type="number" value={maxOrders} onChange={(event) => setMaxOrders(Number(event.target.value))} />
          </label>
          <button onClick={addSlot} className="tap flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 font-black text-paper"><Plus size={18} /> Add slot</button>
        </div>
        </div>
      </section>

      <section className="rounded-[28px] bg-paper p-5 shadow-sm">
        <h2 className="mb-4 text-2xl font-black">Active schedule</h2>
        <div className="space-y-3">
          {slots.map((slot) => (
            <article key={slot.id} className="grid gap-3 rounded-3xl border border-line bg-white p-4 sm:grid-cols-[140px_1fr_120px_52px] sm:items-center">
              <label className="text-sm font-bold text-neutral-500">Pickup time
                <input className="tap mt-1 w-full rounded-2xl border border-line bg-white px-4 text-ink" type="time" value={slot.pickupTime} onChange={(event) => saveSlot({ ...slot, pickupTime: event.target.value })} />
              </label>
              <div>
                <label className="text-sm font-bold text-neutral-500">Maximum orders
                  <input className="tap mt-1 w-full rounded-2xl border border-line bg-white px-4 text-ink" type="number" value={slot.maxOrders} onChange={(event) => saveSlot({ ...slot, maxOrders: Number(event.target.value) })} />
                </label>
                <p className="mt-1 text-sm text-neutral-500">{slotUsed(state, slot)} active orders currently reserved.</p>
              </div>
              <label className="flex items-center justify-between rounded-2xl bg-mist px-4 py-3 font-bold">
                Enabled
                <input type="checkbox" checked={slot.active} onChange={(event) => saveSlot({ ...slot, active: event.target.checked })} />
              </label>
              <button
                aria-label="Delete pickup slot"
                className="tap grid rounded-2xl bg-tomato text-white"
                onClick={() => {
                  deletePickupSlot(slot.id);
                  setState(loadState());
                  setNotice("Pickup slot deleted.");
                  window.setTimeout(() => setNotice(""), 2200);
                }}
              >
                <Trash2 size={18} />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
