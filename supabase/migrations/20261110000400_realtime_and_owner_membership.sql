-- Enable INSERT/UPDATE/DELETE realtime stream for persistent Xkere messages.
-- Safe to rerun if messages is already a member of the publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;

-- Community owners may add themselves to private communities they just created.
drop policy if exists community_members_join_public on public.community_members;
create policy community_members_join_public on public.community_members
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (select 1 from public.communities c where c.id = community_id and c.visibility = 'public')
    or public.is_community_owner(community_id)
  )
);
