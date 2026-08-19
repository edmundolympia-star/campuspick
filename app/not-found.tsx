import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4 text-ink">
      <section className="w-full max-w-md rounded-[32px] bg-paper p-6 text-center shadow-soft">
        <h1 className="text-3xl font-black">Page not found</h1>
        <p className="mt-2 text-neutral-500">This CampusPick page is not available.</p>
        <Link href="/vendor/riceball-campus" className="tap mt-6 inline-flex items-center rounded-full bg-ink px-5 font-black text-paper">
          Open demo vendor
        </Link>
      </section>
    </main>
  );
}
