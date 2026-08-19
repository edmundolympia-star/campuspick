alter table public.vendors add column if not exists paused boolean not null default false;
alter table public.vendors add column if not exists pause_message text;
