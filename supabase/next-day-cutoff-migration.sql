alter table public.orders add column if not exists order_date date not null default current_date;

create index if not exists orders_vendor_pickup_date_idx on public.orders (vendor_id, order_date);

drop function if exists public.place_order(text, text, text, time, public.payment_method, jsonb);

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
