create extension if not exists pgcrypto;

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  hero_message text,
  subtext text,
  logo_url text,
  duitnow_qr_url text,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  chinese_name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  daily_stock integer not null check (daily_stock >= 0),
  available boolean not null default true,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.pickup_slots (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  pickup_time time not null,
  max_orders integer not null check (max_orders >= 0),
  active boolean not null default true,
  unique (vendor_id, pickup_time)
);

create type public.order_status as enum ('pending', 'ready', 'collected', 'cancelled');
create type public.payment_method as enum ('pickup', 'duitnow');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  order_number text not null,
  customer_name text not null,
  phone_last4 text not null check (phone_last4 ~ '^[0-9]{4}$'),
  pickup_time time not null,
  payment_method public.payment_method not null,
  status public.order_status not null default 'pending',
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  order_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0)
);

create index orders_vendor_date_idx on public.orders (vendor_id, created_at);
create index orders_vendor_pickup_date_idx on public.orders (vendor_id, order_date);
create unique index orders_vendor_order_number_day_idx on public.orders (vendor_id, order_number, order_date);
create index orders_pickup_status_idx on public.orders (vendor_id, pickup_time, status);
create index order_items_menu_item_idx on public.order_items (menu_item_id);

alter table public.vendors enable row level security;
alter table public.menu_items enable row level security;
alter table public.pickup_slots enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "public can read active vendor data" on public.vendors for select using (true);
create policy "public can read menu" on public.menu_items for select using (true);
create policy "public can read pickup slots" on public.pickup_slots for select using (true);
create policy "public can create orders" on public.orders for insert with check (true);
create policy "public can create order items" on public.order_items for insert with check (true);

-- For an MVP, vendor dashboard writes should be performed through server routes
-- with SUPABASE_SERVICE_ROLE_KEY after Supabase Auth checks the logged-in vendor.

create or replace function public.place_order(
  p_vendor_slug text,
  p_customer_name text,
  p_phone_last4 text,
  p_pickup_date date,
  p_pickup_time time,
  p_payment_method public.payment_method,
  p_items jsonb
) returns table(order_id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendor_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_order_count integer;
  v_slot_capacity integer;
  v_slot_used integer;
  v_total numeric(10, 2) := 0;
  line jsonb;
  v_item menu_items%rowtype;
  v_reserved integer;
  v_quantity integer;
begin
  select id into v_vendor_id from vendors where slug = p_vendor_slug;
  if v_vendor_id is null then
    raise exception 'Vendor not found';
  end if;

  select max_orders into v_slot_capacity
  from pickup_slots
  where vendor_id = v_vendor_id and pickup_time = p_pickup_time and active = true
  for update;

  if v_slot_capacity is null then
    raise exception 'Pickup slot unavailable';
  end if;

  select count(*) into v_slot_used
  from orders
  where vendor_id = v_vendor_id
    and pickup_time = p_pickup_time
    and status <> 'cancelled'
    and order_date = p_pickup_date;

  if v_slot_used >= v_slot_capacity then
    raise exception 'Pickup slot full';
  end if;

  for line in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (line->>'quantity')::integer;
    select * into v_item
    from menu_items
    where id = (line->>'menu_item_id')::uuid and vendor_id = v_vendor_id and available = true
    for update;

    if v_item.id is null or v_quantity <= 0 then
      raise exception 'Invalid menu item';
    end if;

    select coalesce(sum(oi.quantity), 0) into v_reserved
    from order_items oi
    join orders o on o.id = oi.order_id
    where oi.menu_item_id = v_item.id
      and o.status <> 'cancelled'
      and o.order_date = p_pickup_date;

    if v_reserved + v_quantity > v_item.daily_stock then
      raise exception 'Insufficient stock for %', v_item.name;
    end if;

    v_total := v_total + (v_item.price * v_quantity);
  end loop;

  select count(*) + 1 into v_order_count
  from orders
  where vendor_id = v_vendor_id and order_date = p_pickup_date;

  v_order_number := case when p_vendor_slug like '%riceball%' then 'RB' else 'CP' end || lpad(v_order_count::text, 3, '0');

  insert into orders (vendor_id, order_number, customer_name, phone_last4, pickup_time, payment_method, total_amount, order_date)
  values (v_vendor_id, v_order_number, p_customer_name, p_phone_last4, p_pickup_time, p_payment_method, v_total, p_pickup_date)
  returning id into v_order_id;

  for line in select * from jsonb_array_elements(p_items)
  loop
    select * into v_item from menu_items where id = (line->>'menu_item_id')::uuid;
    insert into order_items (order_id, menu_item_id, quantity, unit_price)
    values (v_order_id, v_item.id, (line->>'quantity')::integer, v_item.price);
  end loop;

  return query select v_order_id, v_order_number;
end;
$$;

insert into public.vendors (id, name, slug, description, hero_message, subtext)
values (
  '11111111-1111-1111-1111-111111111111',
  'Rice Ball @ Campus',
  'riceball-campus',
  '今天的饭团，先订，再来拿。',
  '今天的饭团，先订，再来拿。',
  '无需排队 · 选择取餐时间 · 到店直接取'
)
on conflict (slug) do nothing;

insert into public.menu_items (vendor_id, name, chinese_name, description, price, daily_stock, available)
values
('11111111-1111-1111-1111-111111111111', 'Teriyaki Chicken Rice Ball', '照烧鸡饭团', '炙烤照烧鸡、米饭、海苔与清爽小菜。', 8.90, 40, true),
('11111111-1111-1111-1111-111111111111', 'Spicy Tuna Rice Ball', '辣味金枪鱼饭团', '微辣金枪鱼拌酱，适合午餐快速补能。', 9.50, 35, true),
('11111111-1111-1111-1111-111111111111', 'Unagi Tamago Rice Ball', '鳗鱼玉子饭团', '蒲烧鳗鱼与厚蛋烧，口感更丰富。', 10.00, 25, true);

insert into public.pickup_slots (vendor_id, pickup_time, max_orders, active)
values
('11111111-1111-1111-1111-111111111111', '11:30', 15, true),
('11111111-1111-1111-1111-111111111111', '12:00', 20, true),
('11111111-1111-1111-1111-111111111111', '12:30', 20, true),
('11111111-1111-1111-1111-111111111111', '13:00', 20, true),
('11111111-1111-1111-1111-111111111111', '13:30', 20, true);
