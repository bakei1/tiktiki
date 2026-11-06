-- tık. — Supabase şeması
-- Supabase Dashboard > SQL Editor bölümünde bu dosyanın tamamını çalıştır.
-- Uygulama kayıt sırasında profil oluşturur; kanalları ve görevleri kullanıcı ekler.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Kullanıcı profilleri
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text,
  username_lower text generated always as (lower(username)) stored,
  email         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles
  add column if not exists username_lower text generated always as (lower(username)) stored;

create unique index if not exists profiles_username_lower_idx
  on public.profiles (username_lower)
  where username_lower is not null;

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username) on public.profiles to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_username text;
begin
  profile_username := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'username'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '')
  );

  insert into public.profiles (id, username, email)
  values (new.id, profile_username, new.email)
  on conflict (id) do update
    set username = coalesce(excluded.username, public.profiles.username),
        email = excluded.email,
        updated_at = now();

  select p.username into profile_username
  from public.profiles p
  where p.id = new.id;

  update public.list_members
  set username = profile_username
  where user_id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.sync_auth_user_profile();

drop trigger if exists on_auth_user_updated_profile on auth.users;
create trigger on_auth_user_updated_profile
  after update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.sync_auth_user_profile();

-- Mevcut hesapları da profile ekle.
insert into public.profiles (id, username, email)
select
  id,
  coalesce(
    nullif(btrim(raw_user_meta_data ->> 'username'), ''),
    nullif(btrim(raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(raw_user_meta_data ->> 'display_name'), '')
  ),
  email
from auth.users
on conflict (id) do update
  set username = coalesce(excluded.username, public.profiles.username),
      email = excluded.email,
      updated_at = now();

-- ---------------------------------------------------------------------------
-- Kanallar / listeler
-- ---------------------------------------------------------------------------
create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 48),
  description text not null default '',
  color       text not null default 'lime'
                check (color in ('lime', 'sky', 'peach', 'lilac')),
  position    integer not null default 0,
  is_shared   boolean not null default false,
  invite_code text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.lists add column if not exists is_shared boolean not null default false;
alter table public.lists add column if not exists invite_code text;
create unique index if not exists lists_invite_code_idx
  on public.lists (invite_code) where invite_code is not null;

create table if not exists public.list_members (
  list_id    uuid not null references public.lists (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  username   text,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (list_id, user_id)
);

create index if not exists list_members_user_idx on public.list_members (user_id, list_id);

create or replace function public.is_list_member(p_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.list_members m
    where m.list_id = p_list_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_list_owner(p_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.list_members m
    where m.list_id = p_list_id and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

revoke all on function public.is_list_member(uuid) from public, anon;
revoke all on function public.is_list_owner(uuid) from public, anon;
grant execute on function public.is_list_member(uuid) to authenticated;
grant execute on function public.is_list_owner(uuid) to authenticated;

create or replace function public.add_list_owner_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.list_members (list_id, user_id, username, role)
  values (
    new.id,
    new.user_id,
    (select p.username from public.profiles p where p.id = new.user_id),
    'owner'
  )
  on conflict (list_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists lists_add_owner_member on public.lists;
create trigger lists_add_owner_member
  after insert on public.lists
  for each row execute procedure public.add_list_owner_member();

-- Mevcut kanalların sahiplerini de üye olarak ekle.
insert into public.list_members (list_id, user_id, username, role)
select l.id, l.user_id, p.username, 'owner'
from public.lists l
left join public.profiles p on p.id = l.user_id
on conflict (list_id, user_id) do nothing;

create or replace function public.create_list(
  p_id uuid,
  p_name text,
  p_description text,
  p_color text,
  p_position integer,
  p_is_shared boolean,
  p_invite_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_list public.lists%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.lists (
    id, user_id, name, description, color, position, is_shared, invite_code
  ) values (
    p_id, auth.uid(), p_name, coalesce(p_description, ''),
    coalesce(p_color, 'lime'), coalesce(p_position, 0),
    coalesce(p_is_shared, false), p_invite_code
  )
  returning * into created_list;

  return to_jsonb(created_list);
end;
$$;

revoke all on function public.create_list(uuid, text, text, text, integer, boolean, text)
  from public, anon;
grant execute on function public.create_list(uuid, text, text, text, integer, boolean, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Görevler
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list_id      uuid not null references public.lists (id) on delete cascade,
  title        text not null check (char_length(trim(title)) between 1 and 300),
  note         text check (note is null or char_length(note) <= 1000),
  completed    boolean not null default false,
  priority     text not null default 'normal'
                 check (priority in ('low', 'normal', 'high')),
  due_date     date,
  tags         text[] not null default '{}'::text[],
  assignee_id  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  updated_at   timestamptz not null default now()
);

alter table public.tasks add column if not exists assignee_id uuid references auth.users (id) on delete set null;

create table if not exists public.channel_messages (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references public.lists (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body        text not null check (char_length(trim(body)) between 1 and 4000),
  created_at  timestamptz not null default now()
);

create index if not exists channel_messages_list_created_idx
  on public.channel_messages (list_id, created_at);

create or replace function public.join_list_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_list public.lists%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into target_list
  from public.lists
  where invite_code = p_code and is_shared = true;

  if not found then
    raise exception 'Invitation not found';
  end if;

  insert into public.list_members (list_id, user_id, username, role)
  values (
    target_list.id,
    auth.uid(),
    (select p.username from public.profiles p where p.id = auth.uid()),
    'member'
  )
  on conflict (list_id, user_id) do nothing;

  return target_list.id;
end;
$$;

revoke all on function public.join_list_by_code(text) from public, anon;
grant execute on function public.join_list_by_code(text) to authenticated;

create index if not exists lists_user_position_idx
  on public.lists (user_id, position, created_at);

create index if not exists tasks_user_created_idx
  on public.tasks (user_id, created_at);

create index if not exists tasks_list_idx
  on public.tasks (list_id);

create index if not exists tasks_user_due_idx
  on public.tasks (user_id, due_date)
  where completed = false;

-- ---------------------------------------------------------------------------
-- updated_at otomatiği
-- ---------------------------------------------------------------------------
create or replace function public.tik_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lists_set_updated_at on public.lists;
create trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.tik_set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.tik_set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Üyeler kendi kanallarını okuyup ortak kanallarında işlem yapabilir.
-- ---------------------------------------------------------------------------
alter table public.lists enable row level security;
alter table public.tasks enable row level security;
alter table public.list_members enable row level security;
alter table public.channel_messages enable row level security;

drop policy if exists "lists owner all" on public.lists;
drop policy if exists "lists member read" on public.lists;
drop policy if exists "lists owner insert" on public.lists;
drop policy if exists "lists owner update" on public.lists;
drop policy if exists "lists owner delete" on public.lists;
create policy "lists owner all"
  on public.lists
  for select
  to authenticated
  using (public.is_list_member(id));

create policy "lists owner insert"
  on public.lists for insert to authenticated
  with check (auth.uid() = user_id);

create policy "lists owner update"
  on public.lists for update to authenticated
  using (public.is_list_owner(id))
  with check (public.is_list_owner(id));

create policy "lists owner delete"
  on public.lists for delete to authenticated
  using (public.is_list_owner(id));

drop policy if exists "tasks owner all" on public.tasks;
drop policy if exists "tasks member read" on public.tasks;
drop policy if exists "tasks member insert" on public.tasks;
drop policy if exists "tasks member update" on public.tasks;
drop policy if exists "tasks member delete" on public.tasks;
create policy "tasks owner all"
  on public.tasks
  for select
  to authenticated
  using (public.is_list_member(list_id));

create policy "tasks member insert"
  on public.tasks for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_list_member(list_id)
    and (assignee_id is null or exists (
      select 1 from public.list_members m
      where m.list_id = tasks.list_id and m.user_id = tasks.assignee_id
    ))
  );

create policy "tasks member update"
  on public.tasks for update to authenticated
  using (public.is_list_member(list_id))
  with check (
    public.is_list_member(list_id)
    and (assignee_id is null or exists (
      select 1 from public.list_members m
      where m.list_id = tasks.list_id and m.user_id = tasks.assignee_id
    ))
  );

create policy "tasks member delete"
  on public.tasks for delete to authenticated
  using (public.is_list_member(list_id));

drop policy if exists "list members read" on public.list_members;
create policy "list members read"
  on public.list_members for select to authenticated
  using (public.is_list_member(list_id));

drop policy if exists "channel messages member read" on public.channel_messages;
create policy "channel messages member read"
  on public.channel_messages for select to authenticated
  using (public.is_list_member(list_id));

drop policy if exists "channel messages member insert" on public.channel_messages;
create policy "channel messages member insert"
  on public.channel_messages for insert to authenticated
  with check (auth.uid() = user_id and public.is_list_member(list_id));

drop policy if exists "channel messages author delete" on public.channel_messages;
create policy "channel messages author delete"
  on public.channel_messages for delete to authenticated
  using (auth.uid() = user_id and public.is_list_member(list_id));

-- Tarayıcıdaki anon role tablolara doğrudan erişemez.
revoke all on public.lists from anon;
revoke all on public.tasks from anon;
revoke all on public.list_members from anon, authenticated;
grant select on public.list_members to authenticated;
revoke all on public.channel_messages from anon;
grant select, insert, delete on public.channel_messages to authenticated;
grant select, insert, update, delete on public.lists to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (uygulama sekmeler arası değişiklikleri otomatik yeniler)
-- ---------------------------------------------------------------------------
alter table public.lists replica identity full;
alter table public.tasks replica identity full;
alter table public.list_members replica identity full;
alter table public.channel_messages replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.lists;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.tasks;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.list_members;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.channel_messages;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;

commit;
