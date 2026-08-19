# CampusPick

CampusPick is a production-ready MVP for university food preorder and pickup. Students scan a vendor QR code, order quickly without an account, choose a pickup time, and receive an order number. Vendors manage orders, stock, menu items, pickup slots, and printable QR codes.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth and Postgres
- Vercel-ready deployment

## Local development

```bash
npm install
npm run dev
```

Open:

- Student page: `http://localhost:3000/vendor/riceball-campus`
- Vendor dashboard: `http://localhost:3000/dashboard`
- Vendor login: `http://localhost:3000/login`

The app includes a browser-storage demo mode, so the main flow works before Supabase credentials are added. Place an order from the student page, then open the dashboard in the same browser to see stock, revenue, and order status updates.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/safe-setup.sql` in the SQL editor. It is safe to rerun while setting up.
4. Create a vendor user in Supabase Auth.
5. Copy `.env.example` to `.env.local`.
6. Add your Supabase project URL, anon key, and service-role key.

Environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DISABLE_DASHBOARD_AUTH=true
DASHBOARD_PASSWORD=
```

Set `NEXT_PUBLIC_DISABLE_DASHBOARD_AUTH=true` for MVP testing if you have not created vendor Supabase Auth users yet. Remove it or set it to `false` before real vendor use.
Set `DASHBOARD_PASSWORD` to protect the vendor dashboard with one shared password. This is simpler than Supabase Auth and works well for a single owner.

The QR code uses the current browser origin in the dashboard, so production QR links automatically use the deployed domain. `NEXT_PUBLIC_SITE_URL` is still useful for future server-rendered URLs or integrations.

## Database model

The schema includes:

- `vendors`
- `menu_items`
- `pickup_slots`
- `orders`
- `order_items`

The `place_order` Postgres function locks the relevant pickup slot and menu rows, checks remaining stock, checks pickup-slot capacity, creates a date-scoped order number such as `RB001`, and inserts order items in one transaction. Cancelled orders do not count toward reserved stock or pickup capacity.

## MVP routes

- `/vendor/riceball-campus`: mobile-first student ordering page
- `/login`: vendor login screen using Supabase Auth when configured
- `/dashboard`: order queue, statistics, filters, status controls, QR download
- `/dashboard/menu`: create, edit, disable, sell out, and delete menu items
- `/dashboard/settings`: edit vendor info, upload vendor/DuitNow QR images, and manage pickup slots
- `/dashboard/qr`: print-ready vendor QR poster
- `/order`: student order lookup by order number and phone last 4 digits
- `/order/[id]`: student order summary page for reopening a placed order

## Demo checklist

1. Open `/vendor/riceball-campus`.
2. Choose quantities, pickup time, name, phone last 4 digits, and payment method.
3. Confirm preorder and copy the order number.
4. Open `/order` and search using the order number and phone last 4 digits.
5. Cancel the order from the order detail page within 30 minutes while it is still pending.
6. Open `/dashboard`.
7. Confirm the order appears under the selected pickup time.
8. Mark it Ready, then Collected.
9. Open `/dashboard/menu` and edit stock or availability.
10. Open `/dashboard/settings` and change pickup-slot capacity.
11. Download the vendor QR from `/dashboard`.
12. Open `/dashboard/qr` to print a stall poster.

## Editable vendor content

When Supabase environment variables are configured, menu data, vendor content, orders, pickup slots, and uploaded images are stored in Supabase. The app falls back to browser-storage demo mode only when Supabase is not configured.

Create a public Supabase Storage bucket named `campuspick` for item photos, vendor photos, and DuitNow QR images. The server upload route stores images in that bucket and saves public URLs in `menu_items.image_url`, `vendors.logo_url`, or `vendors.duitnow_qr_url`.

## Vercel deployment

1. Push this project to a Git repository.
2. Import the repository in Vercel.
3. Add the same environment variables from `.env.example`.
4. Deploy.
5. Set `NEXT_PUBLIC_SITE_URL` to the Vercel production URL.

## Production notes

- Keep student ordering accountless.
- Use Supabase Auth for vendor access.
- Add server routes for vendor mutations that verify the authenticated vendor before using `SUPABASE_SERVICE_ROLE_KEY`.
- Store item images and DuitNow QR images in Supabase Storage.
- Replace demo browser-storage calls with Supabase queries and the `place_order` RPC when going live.
- The current database structure supports multiple vendors through `vendor_id` and unique vendor slugs.
