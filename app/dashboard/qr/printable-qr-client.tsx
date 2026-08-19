"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { loadState } from "@/lib/demo-store";
import { fetchCloudState } from "@/lib/cloud-client";
import type { Vendor } from "@/lib/types";

export function PrintableQrClient() {
  const [vendor, setVendor] = useState<Vendor>(() => loadState().vendors[0]);

  useEffect(() => {
    fetchCloudState()
      .then((result) => {
        if (result.mode === "cloud") setVendor(result.state.vendors[0]);
      })
      .catch(() => undefined);
  }, []);

  const publicUrl = typeof window === "undefined" ? `/vendor/${vendor.slug}` : `${window.location.origin}/vendor/${vendor.slug}`;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="rounded-[28px] bg-paper p-5 shadow-sm">
        <div className="mx-auto max-w-lg rounded-[32px] bg-white p-8 text-center shadow-soft print:shadow-none">
          <p className="text-sm font-black uppercase tracking-wider text-matcha">CampusPick</p>
          <h1 className="mt-3 text-4xl font-black">{vendor.name}</h1>
          <p className="mt-3 text-lg font-bold text-neutral-600">Scan to preorder. Pick up on campus.</p>
          <div className="mx-auto mt-8 max-w-[320px] rounded-[28px] border border-line bg-white p-5">
            <QRCodeSVG value={publicUrl} className="h-full w-full" />
          </div>
          <p className="mt-6 text-xl font-black">扫描点餐 · 到点取餐</p>
          <p className="mt-2 break-all text-sm text-neutral-500">{publicUrl}</p>
        </div>
      </section>

      <aside className="rounded-[28px] bg-ink p-5 text-paper shadow-sm print:hidden">
        <h2 className="text-2xl font-black">Print-ready QR</h2>
        <p className="mt-2 text-sm text-neutral-300">This page is formatted as a simple stall poster. Print it or save it as PDF from your browser.</p>
        <button onClick={() => window.print()} className="tap mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-paper px-4 font-black text-ink">
          <Printer size={18} /> Print poster
        </button>
        <Link href="/dashboard" className="tap mt-3 flex w-full items-center justify-center rounded-full bg-white/10 px-4 font-black text-paper">Back to orders</Link>
      </aside>
    </div>
  );
}
