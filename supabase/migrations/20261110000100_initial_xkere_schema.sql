-- Xkere initial relational model (Supabase/PostgreSQL)
-- Apply with the matching RLS and auth-profile migrations.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 24),
  display_name text not null default '',
  avatar_url text,
  bio text not null default '',
  presence text not null default 'offline' check (presence in ('online','idle','dnd','offline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,48}$'),
  description text not null default '',
  icon_url text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  nickname text,
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.community_roles (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  permissions bigint not null default 0,
  is_system boolean not null default false,
  unique (community_id, name),
  unique (id, community_id)
);

create table if not exists public.member_roles (
  community_id uuid not null,
  user_id uuid not null,
  role_id uuid not null,
  assigned_at timestamptz not null default now(),
  primary key (community_id, user_id, role_id),
  foreign key (community_id, user_id) references public.community_members(community_id, user_id) on delete cascade,
  foreign key (role_id, community_id) references public.community_roles(id, community_id) on delete cascade
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  parent_id uuid,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('text','voice','category')),
  topic text not null default '',
  position integer not null default 0,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, community_id),
  foreign key (parent_id, community_id) references public.channels(id, community_id) on delete set null (parent_id)
);

create table if not exists public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 4000),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_channel_created_idx on public.messages(channel_id, created_at desc);
create index if not exists community_members_user_idx on public.community_members(user_id);
create index if not exists channels_community_position_idx on public.channels(community_id, position);

create table if not exists public.friendships (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table if not exists public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_participant_id text,
  joined_at timestamptz not null default now(),
  unique (channel_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_roles enable row level security;
alter table public.member_roles enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;
alter table public.friendships enable row level security;
alter table public.voice_sessions enable row level security;
