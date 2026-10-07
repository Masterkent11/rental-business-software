drop policy if exists org_isolation on listings;
create policy org_isolation on listings using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);

drop policy if exists organizations_owner_update on organizations;
create policy organizations_owner_update on organizations for update using (
  id = nullif(current_setting('app.organization_id', true), '')::uuid
);
