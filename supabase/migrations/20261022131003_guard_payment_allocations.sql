begin;

create function app_private.guard_payment_allocation() returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  source_payment public.payments%rowtype;
  target_invoice public.invoices%rowtype;
  payment_allocated numeric;
  invoice_allocated numeric;
begin
  select * into source_payment from public.payments
  where id = new.payment_id and organization_id = new.organization_id
  for update;
  if not found then
    raise exception 'No applicable payment in this organization'
      using errcode = '23514', constraint = 'payment_application_payment_scope';
  end if;
  if source_payment.state <> 'SUCCEEDED' then
    raise exception 'Only settled payments can be allocated'
      using errcode = '23514', constraint = 'payment_application_payment_state';
  end if;

  select * into target_invoice from public.invoices
  where id = new.invoice_id and organization_id = new.organization_id
  for update;
  if not found then
    raise exception 'No applicable invoice in this organization'
      using errcode = '23514', constraint = 'payment_application_invoice_scope';
  end if;
  if target_invoice.state not in ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE') then
    raise exception 'This invoice cannot take a payment'
      using errcode = '23514', constraint = 'payment_application_invoice_state';
  end if;

  select coalesce(sum(amount_centavos), 0) into payment_allocated
  from public.payment_applications where payment_id = new.payment_id;
  if payment_allocated + new.amount_centavos > source_payment.amount_centavos then
    raise exception 'The allocation exceeds the remaining payment balance'
      using errcode = '23514', constraint = 'payment_application_payment_balance';
  end if;

  select coalesce(sum(amount_centavos), 0) into invoice_allocated
  from public.payment_applications where invoice_id = new.invoice_id;
  if invoice_allocated + new.amount_centavos > target_invoice.total_centavos then
    raise exception 'The allocation exceeds the remaining invoice balance'
      using errcode = '23514', constraint = 'payment_application_invoice_balance';
  end if;
  return new;
end;
$$;

revoke all on function app_private.guard_payment_allocation() from public;

create trigger payment_application_guard
before insert on public.payment_applications
for each row execute function app_private.guard_payment_allocation();

commit;
