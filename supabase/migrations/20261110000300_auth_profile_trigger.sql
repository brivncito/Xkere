-- Ensure newly-created Auth users receive a profile row for Xkere.
-- A UUID suffix prevents signup failures when two emails share the same local part.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  safe_username text;
  base_username text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1), 'player'));
  safe_username := regexp_replace(requested_username, '[^a-z0-9_]', '', 'g');

  if char_length(safe_username) < 3 then
    safe_username := 'player';
  end if;

  base_username := left(safe_username, 17);
  if exists (select 1 from public.profiles p where p.username = safe_username) then
    safe_username := base_username || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    left(safe_username, 24),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), left(safe_username, 24))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_xkere on auth.users;
create trigger on_auth_user_created_xkere
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
