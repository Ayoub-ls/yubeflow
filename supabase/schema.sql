-- Run this once in Supabase > SQL Editor.
-- Accounts are created by you (the admin) from the dashboard. Nobody can sign up on their own.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  business_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Admin check used by the policies (security definer avoids recursive RLS).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Every new auth user gets a profile. Role is always 'user': metadata is never trusted for it.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, business_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'business_name');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Clients may edit their own name/business, but never role, status or email.
-- (auth.uid() is null in the SQL editor, so you can still bootstrap the first admin there.)
create or replace function public.protect_profile_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and (
    new.role is distinct from old.role or new.status is distinct from old.status or new.email is distinct from old.email
  ) then
    raise exception 'You are not allowed to change these fields';
  end if;
  return new;
end $$;

create trigger protect_profile_columns before update on public.profiles
  for each row execute function public.protect_profile_columns();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;

create policy "profiles: read own or admin" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profiles: update own or admin" on public.profiles for update
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "settings: owner full access" on public.user_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- First admin: create your own user in Authentication > Users > Add user, then run:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
