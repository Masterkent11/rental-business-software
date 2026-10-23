create or replace function app_private.guard_agent_verification()
returns trigger
language plpgsql
set search_path = pg_temp
as $$
declare
  actor text := coalesce(current_setting('app.verification_actor', true), '');
begin
  if tg_op = 'INSERT' then
    if new.verification_state not in ('UNVERIFIED', 'PENDING') and actor = '' then
      raise exception 'Agent verification can only be granted by the platform' using errcode = '42501';
    end if;
    if actor = '' and (new.verified_at is not null or new.verified_by is not null) then
      raise exception 'Agent verification can only be granted by the platform' using errcode = '42501';
    end if;
    return new;
  end if;

  if actor = '' and (
       new.verified_at is distinct from old.verified_at
    or new.verified_by is distinct from old.verified_by
    or new.verification_note is distinct from old.verification_note
    or (new.verification_state is distinct from old.verification_state
        and not (old.verification_state in ('UNVERIFIED', 'REJECTED') and new.verification_state = 'PENDING'))
  ) then
    raise exception 'Agent verification can only be changed by the platform' using errcode = '42501';
  end if;
  if actor = '' and old.verification_state in ('PENDING', 'VERIFIED') and (
    new.license_number is distinct from old.license_number
    or new.license_authority is distinct from old.license_authority
  ) then
    new.verification_state := 'UNVERIFIED';
    new.verified_at := null;
    new.verified_by := null;
    new.verification_note := null;
  end if;
  return new;
end $$;
