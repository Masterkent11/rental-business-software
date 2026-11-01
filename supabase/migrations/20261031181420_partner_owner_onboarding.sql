alter table public.organizations
  add column onboarding_user_id uuid references public.user_profiles(id);

create unique index organizations_onboarding_user
  on public.organizations (onboarding_user_id)
  where onboarding_user_id is not null;

create policy organizations_partner_onboarding on public.organizations
  for insert to rental_app
  with check (
    onboarding_user_id = nullif(current_setting('app.user_id', true), '')::uuid
    and state = 'DRAFT'
    and publish_delegation = false
  );

grant insert on public.organizations to rental_app;
