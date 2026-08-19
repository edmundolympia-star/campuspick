"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function login() {
    const nextPath = new URLSearchParams(window.location.search).get("next") || "/dashboard";
    const passwordResponse = await fetch("/api/dashboard-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (passwordResponse.ok) {
      window.location.href = nextPath;
      return;
    }

    if (passwordResponse.status !== 400) {
      const data = await passwordResponse.json().catch(() => ({}));
      setMessage(data.error || "Wrong dashboard password.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Demo mode: Supabase credentials are not configured. Continue to dashboard.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : "Signed in. Continue to dashboard.");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4 text-ink">
      <section className="w-full max-w-md rounded-[32px] bg-paper p-6 shadow-soft">
        <h1 className="text-3xl font-black">Vendor login</h1>
        <p className="mt-2 text-sm text-neutral-500">Enter your dashboard password to manage CampusPick.</p>
        <div className="mt-6 space-y-3">
          <input className="tap w-full rounded-2xl border border-line bg-white px-4" placeholder="Email, optional for Supabase Auth" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input className="tap w-full rounded-2xl border border-line bg-white px-4" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button onClick={login} className="tap w-full rounded-full bg-ink px-4 font-black text-paper">Log in</button>
          {message && <p className="rounded-2xl bg-wasabi px-4 py-3 text-sm font-bold">{message}</p>}
          <Link href="/dashboard" className="tap block rounded-full bg-mist px-4 py-3 text-center font-black">Open dashboard</Link>
        </div>
      </section>
    </main>
  );
}
