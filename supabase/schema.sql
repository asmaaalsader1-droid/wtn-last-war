create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'خطة بلا عنوان',
  alliance_name text,
  notes text,
  war_duration_seconds integer not null default 1800 check (war_duration_seconds = 1800),
  status text not null default 'draft' check (status in ('draft', 'ready')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans add column if not exists alliance_name text;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  power numeric not null check (power > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.plan_buildings (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  building_number integer not null check (building_number between 1 and 11),
  rate numeric not null check (rate >= 0),
  enabled boolean not null default true,
  unique (plan_id, building_number)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  building_number integer not null check (building_number between 1 and 11),
  created_at timestamptz not null default now(),
  unique (plan_id, player_id)
);

create index if not exists plans_owner_id_idx on public.plans(owner_id);
create index if not exists players_plan_id_idx on public.players(plan_id);
create index if not exists assignments_plan_id_idx on public.assignments(plan_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name) values (new.id, coalesce(new.email, ''), nullif(trim(new.raw_user_meta_data->>'display_name'), '')) on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.players enable row level security;
alter table public.plan_buildings enable row level security;
alter table public.assignments enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using (auth.uid() = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert with check (auth.uid() = id);

drop policy if exists plans_owner on public.plans;
create policy plans_owner on public.plans for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists players_owner on public.players;
create policy players_owner on public.players for all using (exists (select 1 from public.plans p where p.id = players.plan_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.plans p where p.id = players.plan_id and p.owner_id = auth.uid()));

drop policy if exists plan_buildings_owner on public.plan_buildings;
create policy plan_buildings_owner on public.plan_buildings for all using (exists (select 1 from public.plans p where p.id = plan_buildings.plan_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.plans p where p.id = plan_buildings.plan_id and p.owner_id = auth.uid()));

drop policy if exists assignments_owner on public.assignments;
create policy assignments_owner on public.assignments for all using (exists (select 1 from public.plans p where p.id = assignments.plan_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.plans p where p.id = assignments.plan_id and p.owner_id = auth.uid()));

create or replace function public.validate_assignment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.players p where p.id = new.player_id and p.plan_id = new.plan_id) then
    raise exception 'assignment_player_plan_mismatch';
  end if;
  if not exists (select 1 from public.plan_buildings b where b.plan_id = new.plan_id and b.building_number = new.building_number and b.enabled) then
    raise exception 'assignment_building_disabled_or_missing';
  end if;
  return new;
end;
$$;

drop trigger if exists assignments_validate on public.assignments;
create trigger assignments_validate
before insert or update on public.assignments
for each row execute procedure public.validate_assignment();

create or replace function public.validate_building_toggle()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.enabled and not new.enabled and exists (select 1 from public.assignments a where a.plan_id = new.plan_id and a.building_number = new.building_number) then
    raise exception 'cannot_disable_assigned_building';
  end if;
  return new;
end;
$$;

drop trigger if exists plan_buildings_validate_toggle on public.plan_buildings;
create trigger plan_buildings_validate_toggle
before update on public.plan_buildings
for each row execute procedure public.validate_building_toggle();

create or replace function public.save_plan_bundle(
  p_plan_id uuid,
  p_title text,
  p_alliance_name text,
  p_notes text,
  p_war_duration_seconds integer,
  p_status text,
  p_players jsonb,
  p_buildings jsonb,
  p_assignments jsonb
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_plan_id uuid := coalesce(p_plan_id, gen_random_uuid());
  v_invalid_assignments integer;
begin
  if v_owner_id is null then raise exception 'not_authenticated'; end if;
  if p_war_duration_seconds <> 1800 then raise exception 'war_duration_must_be_1800'; end if;
  if p_status not in ('draft', 'ready') then raise exception 'invalid_plan_status'; end if;

  if exists (select 1 from public.plans where id = v_plan_id and owner_id <> v_owner_id) then
    raise exception 'plan_not_owned';
  end if;

  insert into public.plans (id, owner_id, title, alliance_name, notes, war_duration_seconds, status, updated_at)
  values (v_plan_id, v_owner_id, coalesce(nullif(trim(p_title), ''), 'خطة بلا عنوان'), nullif(trim(p_alliance_name), ''), p_notes, 1800, p_status, now())
  on conflict (id) do update set title = excluded.title, alliance_name = excluded.alliance_name, notes = excluded.notes, war_duration_seconds = excluded.war_duration_seconds, status = excluded.status, updated_at = now();

  delete from public.assignments where plan_id = v_plan_id;
  delete from public.players where plan_id = v_plan_id;
  delete from public.plan_buildings where plan_id = v_plan_id;

  insert into public.players (id, plan_id, name, power)
  select p.id, v_plan_id, trim(p.name), p.power
  from jsonb_to_recordset(coalesce(p_players, '[]'::jsonb)) as p(id uuid, name text, power numeric);

  insert into public.plan_buildings (plan_id, building_number, rate, enabled)
  select v_plan_id, b.building_number, b.rate, b.enabled
  from jsonb_to_recordset(coalesce(p_buildings, '[]'::jsonb)) as b(building_number integer, rate numeric, enabled boolean);

  select count(*) into v_invalid_assignments
  from jsonb_to_recordset(coalesce(p_assignments, '[]'::jsonb)) as a(player_id uuid, building_number integer)
  where not exists (select 1 from public.players p where p.id = a.player_id and p.plan_id = v_plan_id)
     or not exists (select 1 from public.plan_buildings b where b.plan_id = v_plan_id and b.building_number = a.building_number and b.enabled);
  if v_invalid_assignments > 0 then raise exception 'invalid_assignment_bundle'; end if;

  insert into public.assignments (plan_id, player_id, building_number)
  select v_plan_id, a.player_id, a.building_number
  from jsonb_to_recordset(coalesce(p_assignments, '[]'::jsonb)) as a(player_id uuid, building_number integer);

  return v_plan_id;
end;
$$;

revoke all on function public.save_plan_bundle(uuid, text, text, text, integer, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.save_plan_bundle(uuid, text, text, text, integer, text, jsonb, jsonb, jsonb) to authenticated;
