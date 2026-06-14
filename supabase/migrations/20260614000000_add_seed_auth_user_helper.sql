-- Reusable, correct way to create an email/password auth user from SQL.
--
-- Why this exists: directly INSERTing into auth.users (e.g. ad-hoc seeding via
-- the SQL editor) is easy to get wrong. If the token columns are left NULL,
-- GoTrue cannot scan the user row and returns HTTP 500 on /token (login) and
-- /recover (password reset) with:
--   "Scan error on column ... confirmation_token: converting NULL to string is
--    unsupported"  ->  "500: Database error querying schema"
-- (This is what broke the brian.gaines1@gmail.com login on 2026-06-13.)
--
-- This helper initialises every token/change column to '' (never NULL),
-- pre-confirms the email, and bcrypt-hashes the password via pgcrypto.
-- The existing handle_new_user() trigger then builds the profile + role row
-- from raw_user_meta_data, so pass 'role'/'name' (+ any role-specific keys
-- like 'rics', 'region', 'council_name', 'business_name') in p_metadata.
--
-- Usage (run as service role / in the SQL editor):
--   select public.seed_auth_user(
--     'someone@example.com', 'their-password',
--     '{"name":"Some One","role":"surveyor","rics":"1234567","region":"London"}'::jsonb);

create or replace function public.seed_auth_user(
  p_email    text,
  p_password text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where email = lower(p_email)) then
    raise exception 'auth user already exists: %', lower(p_email);
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current, email_change,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id, 'authenticated', 'authenticated', lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, p_metadata,
    now(), now(),
    '', '', '', '', '', '', '', ''
  );

  return v_id;
end;
$$;

-- Privileged helper: only the service role / postgres should call it.
revoke execute on function public.seed_auth_user(text, text, jsonb) from public, anon, authenticated;
