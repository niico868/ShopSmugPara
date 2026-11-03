-- Members: people who join from the pop-up or the /members page. Safe to run more than once.
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  birth_month int check (birth_month between 1 and 12),
  birth_day int check (birth_day between 1 and 31),
  consent boolean not null check (consent),
  source text not null default 'popup',
  created_at timestamptz not null default now()
);
create unique index if not exists members_email_key on public.members (lower(email));

alter table public.members enable row level security;

-- Anyone can join, only with consent. Nobody but an admin can read the list.
drop policy if exists "members join" on public.members;
create policy "members join" on public.members for insert to anon, authenticated with check (consent);
drop policy if exists "members admin read" on public.members;
create policy "members admin read" on public.members for select using (public.is_admin());
drop policy if exists "members admin delete" on public.members;
create policy "members admin delete" on public.members for delete using (public.is_admin());
