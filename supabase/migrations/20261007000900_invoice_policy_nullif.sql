drop policy if exists org_isolation on invoices;
create policy org_isolation on invoices using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);

drop policy if exists org_isolation on invoice_lines;
create policy org_isolation on invoice_lines using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);

drop policy if exists org_isolation on payment_applications;
create policy org_isolation on payment_applications using (
  organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
);

drop policy if exists own_invoice on invoices;
create policy own_invoice on invoices for select using (
  tenant_id = nullif(current_setting('app.user_id', true), '')::uuid
);

drop policy if exists own_invoice_line on invoice_lines;
create policy own_invoice_line on invoice_lines for select using (
  exists (
    select 1 from invoices i
     where i.id = invoice_lines.invoice_id
       and i.tenant_id = nullif(current_setting('app.user_id', true), '')::uuid
  )
);
