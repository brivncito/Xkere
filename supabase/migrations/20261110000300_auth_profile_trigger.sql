-- Ensure newly-created Auth users receive a profile row for Xkere.
-- Username is taken from Auth user metadata, then falls back to a unique handle.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  safe_username text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'player'));
  safe_username := regexp_replace(requested_username, '[^a-z0-9_]', '', 'g');
  if char_length(safe_username) < 3 then
    safe_username := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  safe_username := left(safe_username, 24);

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    safe_username,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), safe_username)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_xkere on auth.users;
create trigger on_auth_user_created_xkere
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
