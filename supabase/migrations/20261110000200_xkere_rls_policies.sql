-- Security policies for Xkere's initial Supabase schema.
create or replace function public.is_community_member(target_community uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, auth
as $$ select exists (select 1 from public.community_members cm where cm.community_id=target_community and cm.user_id=target_user); $$;
create or replace function public.is_community_owner(target_community uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, auth
as $$ select exists (select 1 from public.communities c where c.id=target_community and c.owner_id=target_user); $$;
create or replace function public.can_access_channel(target_channel uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, auth
as $$ select exists (
  select 1 from public.channels ch
  join public.community_members cm on cm.community_id=ch.community_id and cm.user_id=target_user
  where ch.id=target_channel and (not ch.is_private or exists(
    select 1 from public.channel_members chm where chm.channel_id=ch.id and chm.user_id=target_user
  ))
); $$;

revoke all on function public.is_community_member(uuid,uuid) from public;
revoke all on function public.is_community_owner(uuid,uuid) from public;
revoke all on function public.can_access_channel(uuid,uuid) from public;
grant execute on function public.is_community_member(uuid,uuid) to authenticated;
grant execute on function public.is_community_owner(uuid,uuid) to authenticated;
grant execute on function public.can_access_channel(uuid,uuid) to authenticated;

drop policy if exists profile_select_authenticated on public.profiles;
create policy profile_select_authenticated on public.profiles for select to authenticated using (true);
drop policy if exists profile_insert_self on public.profiles;
create policy profile_insert_self on public.profiles for insert to authenticated with check (id=auth.uid());
drop policy if exists profile_update_self on public.profiles;
create policy profile_update_self on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

drop policy if exists community_select_public_or_member on public.communities;
create policy community_select_public_or_member on public.communities for select to anon,authenticated
using (visibility='public' or owner_id=auth.uid() or public.is_community_member(id));
drop policy if exists community_insert_self_owned on public.communities;
create policy community_insert_self_owned on public.communities for insert to authenticated with check (owner_id=auth.uid());
drop policy if exists community_update_owner on public.communities;
create policy community_update_owner on public.communities for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
drop policy if exists community_delete_owner on public.communities;
create policy community_delete_owner on public.communities for delete to authenticated using (owner_id=auth.uid());

drop policy if exists community_members_select_members on public.community_members;
create policy community_members_select_members on public.community_members for select to authenticated
using (public.is_community_member(community_id));
drop policy if exists community_members_join_public on public.community_members;
create policy community_members_join_public on public.community_members for insert to authenticated
with check (user_id=auth.uid() and exists(select 1 from public.communities c where c.id=community_id and c.visibility='public'));
drop policy if exists community_members_owner_manage on public.community_members;
create policy community_members_owner_manage on public.community_members for all to authenticated
using (public.is_community_owner(community_id)) with check (public.is_community_owner(community_id));

drop policy if exists roles_select_members on public.community_roles;
create policy roles_select_members on public.community_roles for select to authenticated using (public.is_community_member(community_id));
drop policy if exists roles_owner_manage on public.community_roles;
create policy roles_owner_manage on public.community_roles for all to authenticated
using (public.is_community_owner(community_id)) with check (public.is_community_owner(community_id));

drop policy if exists member_roles_select_members on public.member_roles;
create policy member_roles_select_members on public.member_roles for select to authenticated using (public.is_community_member(community_id));
drop policy if exists member_roles_owner_manage on public.member_roles;
create policy member_roles_owner_manage on public.member_roles for all to authenticated
using (public.is_community_owner(community_id)) with check (public.is_community_owner(community_id));

drop policy if exists channels_select_accessible on public.channels;
create policy channels_select_accessible on public.channels for select to anon,authenticated using (
  (not is_private and exists(select 1 from public.communities c where c.id=community_id and c.visibility='public'))
  or (public.is_community_member(community_id) and (not is_private or public.can_access_channel(id)))
);
drop policy if exists channels_owner_manage on public.channels;
create policy channels_owner_manage on public.channels for all to authenticated
using (public.is_community_owner(community_id)) with check (public.is_community_owner(community_id));

drop policy if exists channel_members_select_community on public.channel_members;
create policy channel_members_select_community on public.channel_members for select to authenticated using (
  exists(select 1 from public.channels ch where ch.id=channel_id and public.is_community_member(ch.community_id))
);
drop policy if exists channel_members_join_public_channel on public.channel_members;
create policy channel_members_join_public_channel on public.channel_members for insert to authenticated with check (
  user_id=auth.uid() and exists(select 1 from public.channels ch where ch.id=channel_id and not ch.is_private and public.is_community_member(ch.community_id))
);
drop policy if exists channel_members_leave_self on public.channel_members;
create policy channel_members_leave_self on public.channel_members for delete to authenticated using (user_id=auth.uid());

drop policy if exists messages_select_channel_members on public.messages;
create policy messages_select_channel_members on public.messages for select to authenticated
using (deleted_at is null and public.can_access_channel(channel_id));
drop policy if exists messages_insert_author_channel_member on public.messages;
create policy messages_insert_author_channel_member on public.messages for insert to authenticated
with check (author_id=auth.uid() and public.can_access_channel(channel_id));
drop policy if exists messages_update_author on public.messages;
create policy messages_update_author on public.messages for update to authenticated
using (author_id=auth.uid()) with check (author_id=auth.uid());
drop policy if exists messages_delete_author on public.messages;
create policy messages_delete_author on public.messages for delete to authenticated using (author_id=auth.uid());

drop policy if exists friendships_select_participant on public.friendships;
create policy friendships_select_participant on public.friendships for select to authenticated
using (requester_id=auth.uid() or addressee_id=auth.uid());
drop policy if exists friendships_insert_requester on public.friendships;
create policy friendships_insert_requester on public.friendships for insert to authenticated with check (requester_id=auth.uid());
drop policy if exists friendships_update_participant on public.friendships;
create policy friendships_update_participant on public.friendships for update to authenticated
using (requester_id=auth.uid() or addressee_id=auth.uid()) with check (requester_id=auth.uid() or addressee_id=auth.uid());
drop policy if exists friendships_delete_participant on public.friendships;
create policy friendships_delete_participant on public.friendships for delete to authenticated
using (requester_id=auth.uid() or addressee_id=auth.uid());

drop policy if exists voice_sessions_select_community_members on public.voice_sessions;
create policy voice_sessions_select_community_members on public.voice_sessions for select to authenticated
using (exists(select 1 from public.channels ch where ch.id=channel_id and public.is_community_member(ch.community_id)));
drop policy if exists voice_sessions_manage_self on public.voice_sessions;
create policy voice_sessions_manage_self on public.voice_sessions for all to authenticated
using (user_id=auth.uid() and public.can_access_channel(channel_id))
with check (user_id=auth.uid() and public.can_access_channel(channel_id));
