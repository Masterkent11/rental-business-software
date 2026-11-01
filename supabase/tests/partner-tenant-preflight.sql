begin transaction read only;
select 'organizations' as resource,count(*) as records from public.organizations
union all select 'agent_profiles',count(*) from public.agent_profiles
union all select 'organization_members',count(*) from public.organization_members
union all select 'listings',count(*) from public.listings;
select 'representation_listing_owner' as check_name,count(*) as mismatches from public.listing_representations r join public.listings l on l.id=r.listing_id where l.organization_id<>r.organization_id
union all select 'conversation_listing_owner',count(*) from public.conversations c join public.listings l on l.id=c.listing_id where l.organization_id<>c.organization_id
union all select 'inquiry_listing_owner',count(*) from public.inquiries i join public.listings l on l.id=i.listing_id where l.organization_id<>i.organization_id
union all select 'viewing_listing_owner',count(*) from public.viewings v join public.listings l on l.id=v.listing_id where l.organization_id<>v.organization_id
union all select 'media_listing_owner',count(*) from public.media_assets m join public.listings l on l.id=m.listing_id where l.organization_id<>m.organization_id
union all select 'resource_parent_owner',count(*) from public.rentable_resources r join public.rentable_resources p on p.id=r.parent_id where r.organization_id<>p.organization_id
union all select 'resource_root_owner',count(*) from public.rentable_resources r join public.rentable_resources p on p.id=r.root_id where r.organization_id<>p.organization_id;
select count(*) as unreviewed_dual_memberships from public.agent_profiles a
where a.verification_state<>'VERIFIED' and exists(select 1 from public.organization_members m where m.user_id=a.user_id);
rollback;
