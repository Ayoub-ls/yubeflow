-- Only needed if you already ran the previous schema (the one with plans and trials).
alter table public.profiles drop column if exists plan;
alter table public.profiles drop column if exists trial_ends_at;

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
