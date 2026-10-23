begin;
create policy organization_listing_views on public.listing_view_events
for select to rental_app
using (exists (
  select 1 from public.listings l
  where l.id = listing_view_events.listing_id
    and l.organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
));
commit;
