-- Authorization policies for the initial Xkere schema.
-- These policies favor safe defaults: private channel membership is required,
-- and community management is restricted to the community owner.
create or replace function public.is_community_member(target_community uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_members cm
    where cm.community_id = target_community and cm.user_id = target_user
  );
$$;

create or replace function public.is_community_owner(target_community uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.communities c
    where c.id = target_community and c.owner_id = target_user
  );
$$;

create or replace function public.can_access_channel(target_channel uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.channels ch
    join public.community_members cm on cm.community_id = ch.community_id
    where ch.id = target_channel
      and cm.user_id = target_user
      and (not ch.is_private or exists (
        select 1 from public.channel_members chm
        where chm.channel_id = ch.id and chm.user_id = target_user
      ))
  );
$$;

revoke all on function public.is_community_member(uuid, uuid) from public;
revoke all on function public.is_community_owner(uuid, uuid) from public;
revoke all on function public.can_access_channel(uuid, uuid) from public;
grant execute on function public.is_community_member(uuid, uuid) to authenticated;
grant execute on function public.is_community_owner(uuid, uuid) to authenticated;
grant execute on function public.can_access_channel(uuid, uuid) to authenticated;

drop policy if exists "profiles readable by authenticated users" on public.profiles;
create policy "profiles readable by authenticated users"
  on public.profiles for select to authenticated using (true);
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "public communities readable" on public.communities;
create policy "public communities readable"
  on public.communities for select to anon, authenticated
  using (visibility = 'public' or owner_id = auth.uid() or public.is_community_member(id));
drop policy if exists "authenticated users create communities" on public.communities;
create policy "authenticated users create communities"
  on public.communities for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "owners update communities" on public.communities;
create policy "owners update communities"
  on public.communities for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owners delete communities" on public.communities;
create policy "owners delete communities"
  on public.communities for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "members readable to community members" on public.community_members;
create policy "members readable to community members"
  on public.community_members for select to authenticated using (public.is_community_member(community_id));
drop policy if exists "users join public communities" on public.community_members;
create policy "users join public communities"
  on public.community_members for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.communities c where c.id = community_id and c.visibility = 'public'
  ));
drop policy if exists "owners manage community memberships" on public.community_members;
create policy "owners manage community memberships"
  on public.community_members for all to authenticated
  using (public.is_community_owner(community_id)) with check (public.is_community_owner(community_id));

drop policy if exists "roles readable by community members" on public.community_roles;
create policy "roles readable by community members"
  on public.community_roles for select to authenticated using (public.is_community_member(community_id));
drop policy if exists "owners manage roles" on public.community_roles;
create policy "owners manage roles"
  on public.community_roles for all to authenticated
  using (public.is_community_owner(community_id)) with check (public.is_community_owner(community_id));

drop policy if exists "member roles readable by community members" on public.member_roles;
create policy "member roles readable by community members"
  on public.member_roles for select to authenticated using (public.is_community_member(community_id));
drop policy if exists "owners assign roles" on public.member_roles;
create policy "owners assign roles"
  on public.member_roles for all to authenticated
  using (public.is_community_owner(community_id)) with check (public.is_community_owner(community_id));

drop policy if exists "community channels readable to members or public nonprivate" on public.channels;
create policy "community channels readable to members or public nonprivate"
  on public.channels for select to anon, authenticated
  using (
    not is_private and exists (
      select 1 from public.communities c where c.id = community_id and c.visibility = 'public'
    )
    or (public.is_community_member(community_id) and (not is_private or public.can_access_channel(id)))
  );
drop policy if exists "owners manage channels" on public.channels;
create policy "owners manage channels"
  on public.channels for all to authenticated
  using (public.is_community_owner(community_id)) with check (public.is_community_owner(community_id));

drop policy if exists "channel memberships readable by community members" on public.channel_members;
create policy "channel memberships readable by community members"
  on public.channel_members for select to authenticated
  using (exists (
    select 1 from public.channels ch where ch.id = channel_id
      and public.is_community_member(ch.community_id)
  ));
drop policy if exists "users join accessible channels" on public.channel_members;
create policy "users join accessible channels"
  on public.channel_members for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.channels ch
    where ch.id = channel_id and not ch.is_private
      and public.is_community_member(ch.community_id)
  ));
drop policy if exists "users leave own channel memberships" on public.channel_members;
create policy "users leave own channel memberships"
  on public.channel_members for delete to authenticated using (user_id = auth.uid());

drop policy if exists "messages readable in accessible channels" on public.messages;
create policy "messages readable in accessible channels"
  on public.messages for select to authenticated using (deleted_at is null and public.can_access_channel(channel_id));
drop policy if exists "members send messages in accessible channels" on public.messages;
create policy "members send messages in accessible channels"
  on public.messages for insert to authenticated
  with check (author_id = auth.uid() and public.can_access_channel(channel_id));
drop policy if exists "authors edit own messages" on public.messages;
create policy "authors edit own messages"
  on public.messages for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "authors delete own messages" on public.messages;
create policy "authors delete own messages"
  on public.messages for delete to authenticated using (author_id = auth.uid());

drop policy if exists "users view own friendships" on public.friendships;
create policy "users view own friendships"
  on public.friendships for select to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists "users send friend requests" on public.friendships;
create policy "users send friend requests"
  on public.friendships for insert to authenticated with check (requester_id = auth.uid());
drop policy if exists "participants update friendships" on public.friendships;
create policy "participants update friendships"
  on public.friendships for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists "participants delete friendships" on public.friendships;
create policy "participants delete friendships"
  on public.friendships for delete to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "voice sessions readable by community members" on public.voice_sessions;
create policy "voice sessions readable by community members"
  on public.voice_sessions for select to authenticated
  using (exists (
    select 1 from public.channels ch where ch.id = channel_id
      and public.is_community_member(ch.community_id)
  ));
drop policy if exists "users manage own voice session" on public.voice_sessions;
create policy "users manage own voice session"
  on public.voice_sessions for all to authenticated
  using (user_id = auth.uid() and public.can_access_channel(channel_id))
  with check (user_id = auth.uid() and public.can_access_channel(channel_id));
