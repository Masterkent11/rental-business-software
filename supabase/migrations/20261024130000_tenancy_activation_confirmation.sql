begin;

alter table public.occupancies
  add column activation_confirmed_by uuid references public.user_profiles(id),
  add column activation_confirmed_at timestamptz,
  add constraint occupancy_activation_has_actor check (
    (activation_confirmed_by is null) = (activation_confirmed_at is null)
  ),
  add constraint occupancy_activation_is_lease check (
    activation_confirmed_at is null or kind = 'LEASE'
  );

commit;
