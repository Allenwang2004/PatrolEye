-- PatrolEye v2 schema. Contract: docs/v2/ARCHITECTURE.md

-- Tables

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  device_user_id uuid not null unique references auth.users(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  name text,
  room text,
  claim_code text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create index devices_owner on public.devices (owner_id);

create table public.device_state (
  device_id uuid primary key references public.devices(id) on delete cascade,
  last_seen timestamptz,
  status text not null default 'idle' check (status in ('idle', 'patrolling', 'scanning', 'error')),
  masks_version int not null default 0,
  app_version text
);

create table public.device_commands (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  type text not null check (type in ('scan', 'apply_masks')),
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'error')),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index device_commands_device on public.device_commands (device_id, created_at desc);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  pano_path text not null,
  width int not null,
  height int not null,
  pan0 double precision not null,
  pan1 double precision not null,
  tilt0 double precision not null,
  tilt1 double precision not null,
  px_per_deg double precision not null,
  created_at timestamptz not null default now()
);
create index scans_device on public.scans (device_id, created_at desc);

create table public.masks (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,
  version int not null,
  rects jsonb not null default '[]' check (jsonb_typeof(rects) = 'array'),
  created_at timestamptz not null default now(),
  unique (device_id, version)
);

create table public.events (
  id uuid primary key,
  device_id uuid not null references public.devices(id) on delete cascade,
  ts timestamptz not null default now(),
  type text not null check (type in ('stove_on', 'person_down', 'gauge_high', 'leak', 'light_fault', 'valve_closed', 'other')),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  detail text,
  checkpoint text,
  clip_path text,
  thumb_path text,
  meta jsonb not null default '{}',
  acked_at timestamptz,
  acked_by uuid references auth.users(id)
);
create index events_device_ts on public.events (device_id, ts desc);

-- Triggers

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger device_commands_touch before update on public.device_commands
  for each row execute function public.touch_updated_at();

-- masks.version is assigned here (latest + 1 per device), so two saves at once
-- cannot collide. Whatever version the client sends is ignored.
create function public.masks_next_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('masks:' || new.device_id::text));
  select coalesce(max(version), 0) + 1 into new.version
    from masks where device_id = new.device_id;
  return new;
end $$;

create trigger masks_version before insert on public.masks
  for each row execute function public.masks_next_version();

-- Who is signed in: the owner of a device, or the device itself

create function public.is_owner(d uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from devices where id = d and owner_id = auth.uid());
$$;

create function public.is_device(d uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from devices where id = d and device_user_id = auth.uid());
$$;

-- Same checks on a Storage folder name (text, so a non-uuid path is denied instead of erroring)
create function public.is_owner_folder(f text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from devices where id::text = f and owner_id = auth.uid());
$$;

create function public.is_device_folder(f text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from devices where id::text = f and device_user_id = auth.uid());
$$;

-- Privileges. Supabase grants everything on public tables to anon and
-- authenticated by default; RLS decides rows, these grants decide columns.

revoke all on public.devices, public.device_state, public.device_commands,
              public.scans, public.masks, public.events
  from anon, authenticated;

grant select on public.devices, public.device_state, public.device_commands,
                public.scans, public.masks, public.events
  to authenticated;

grant update (name, room) on public.devices to authenticated;
grant insert (device_id, last_seen, status, masks_version, app_version),
      update (last_seen, status, masks_version, app_version)
  on public.device_state to authenticated;
grant insert (device_id, type, payload) on public.device_commands to authenticated;
grant update (status, result) on public.device_commands to authenticated;
grant insert (id, device_id, pano_path, width, height, pan0, pan1, tilt0, tilt1, px_per_deg)
  on public.scans to authenticated;
grant insert (device_id, scan_id, version, rects) on public.masks to authenticated;
grant insert (id, device_id, ts, type, severity, title, detail, checkpoint, clip_path, thumb_path, meta)
  on public.events to authenticated;
grant update (acked_at, acked_by) on public.events to authenticated;

-- Row level security

alter table public.devices enable row level security;
alter table public.device_state enable row level security;
alter table public.device_commands enable row level security;
alter table public.scans enable row level security;
alter table public.masks enable row level security;
alter table public.events enable row level security;

create policy devices_read on public.devices for select to authenticated
  using (owner_id = auth.uid() or device_user_id = auth.uid());
create policy devices_owner_update on public.devices for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy state_read on public.device_state for select to authenticated
  using (public.is_owner(device_id) or public.is_device(device_id));
create policy state_device_insert on public.device_state for insert to authenticated
  with check (public.is_device(device_id));
create policy state_device_update on public.device_state for update to authenticated
  using (public.is_device(device_id)) with check (public.is_device(device_id));

create policy cmd_read on public.device_commands for select to authenticated
  using (public.is_owner(device_id) or public.is_device(device_id));
create policy cmd_owner_insert on public.device_commands for insert to authenticated
  with check (public.is_owner(device_id));
create policy cmd_device_update on public.device_commands for update to authenticated
  using (public.is_device(device_id)) with check (public.is_device(device_id));

create policy scans_read on public.scans for select to authenticated
  using (public.is_owner(device_id) or public.is_device(device_id));
create policy scans_device_insert on public.scans for insert to authenticated
  with check (public.is_device(device_id));

create policy masks_read on public.masks for select to authenticated
  using (public.is_owner(device_id) or public.is_device(device_id));
create policy masks_owner_insert on public.masks for insert to authenticated
  with check (
    public.is_owner(device_id)
    and (scan_id is null
         or exists (select 1 from public.scans s where s.id = scan_id and s.device_id = masks.device_id))
  );

create policy events_read on public.events for select to authenticated
  using (public.is_owner(device_id));
create policy events_device_insert on public.events for insert to authenticated
  with check (public.is_device(device_id));
create policy events_owner_ack on public.events for update to authenticated
  using (public.is_owner(device_id))
  with check (public.is_owner(device_id) and (acked_by is null or acked_by = auth.uid()));

-- RPC

create function public.claim_device(p_device_id uuid, p_code text)
returns public.devices language plpgsql security definer set search_path = public as $$
declare d devices;
begin
  if auth.uid() is null then
    raise exception 'invalid_claim';
  end if;
  update devices
     set owner_id = auth.uid(), claimed_at = now(), claim_code = null
   where id = p_device_id and owner_id is null
     and claim_code is not null and claim_code = upper(trim(p_code))
  returning * into d;
  if d.id is null then
    raise exception 'invalid_claim';
  end if;
  return d;
end $$;

create function public.device_set_claim_code(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if upper(p_code) !~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$' then
    raise exception 'invalid_code';
  end if;
  update devices set claim_code = upper(p_code)
   where device_user_id = auth.uid() and owner_id is null;
end $$;

revoke execute on function public.is_owner(uuid), public.is_device(uuid),
                           public.is_owner_folder(text), public.is_device_folder(text),
                           public.claim_device(uuid, text), public.device_set_claim_code(text),
                           public.masks_next_version(), public.touch_updated_at()
  from public, anon;
grant execute on function public.is_owner(uuid), public.is_device(uuid),
                          public.is_owner_folder(text), public.is_device_folder(text),
                          public.claim_device(uuid, text), public.device_set_claim_code(text)
  to authenticated;

-- Storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('panoramas', 'panoramas', false, 52428800, array['image/jpeg']),
       ('clips', 'clips', false, 52428800, array['video/mp4', 'image/jpeg'])
on conflict (id) do nothing;

-- Devices write (and overwrite) their own <device_id>/ folder; owners read it.
create policy "device inserts own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('panoramas', 'clips')
              and public.is_device_folder((storage.foldername(name))[1]));
create policy "device updates own folder" on storage.objects for update to authenticated
  using (bucket_id in ('panoramas', 'clips')
         and public.is_device_folder((storage.foldername(name))[1]))
  with check (bucket_id in ('panoramas', 'clips')
              and public.is_device_folder((storage.foldername(name))[1]));
create policy "device reads own folder" on storage.objects for select to authenticated
  using (bucket_id in ('panoramas', 'clips')
         and public.is_device_folder((storage.foldername(name))[1]));
create policy "owner reads own devices" on storage.objects for select to authenticated
  using (bucket_id in ('panoramas', 'clips')
         and public.is_owner_folder((storage.foldername(name))[1]));

-- Realtime

alter publication supabase_realtime add table public.events, public.device_commands, public.device_state;
