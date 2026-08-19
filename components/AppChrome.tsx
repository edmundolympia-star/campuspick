import Link from "next/link";
import { ChefHat } from "lucide-react";

export function DashboardChrome({ children, active }: { children: React.ReactNode; active: "orders" | "menu" | "settings" | "qr" }) {
  const links = [
    { href: "/dashboard", label: "Orders", id: "orders" },
    { href: "/dashboard/menu", label: "Menu", id: "menu" },
    { href: "/dashboard/settings", label: "Settings", id: "settings" },
    { href: "/dashboard/qr", label: "QR", id: "qr" }
  ] as const;

  return (
    <main className="min-h-screen bg-mist text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-black">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-paper">
              <ChefHat size={20} />
            </span>
            CampusPick
          </Link>
          <nav className="flex rounded-full bg-paper p-1 shadow-sm">
            {links.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${active === link.id ? "bg-ink text-paper" : "text-neutral-600"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
