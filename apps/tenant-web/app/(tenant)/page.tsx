import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page, Panel, SectionHeading, TopBar } from "@/components/tenant/shell";
import { Photo } from "@/components/tenant/photo";
import { InvoiceStatus, MaintenanceStatus } from "@/components/tenant/status";
import {
  lease,
  maintenance,
  openInvoices,
  outstandingCentavos,
  payments,
  propertyPhoto,
} from "@/lib/fixtures";
import { formatDate, formatDateTime, peso, relativeDue } from "@/lib/money";

/**
 * Overview — a dashboard, laid out as one.
 *
 * Two columns on desktop: the money down the main column, context down the
 * side. The journey's requirement drives the hierarchy — "a single unambiguous
 * answer to *what do I owe right now?*" is the largest thing on the page, with
 * the claims behind it immediately beside it, not below the fold.
 */
export default function OverviewPage() {
  const overdue = openInvoices.filter((i) => i.state === "OVERDUE");
  const openRequests = maintenance.filter(
    (m) => m.state !== "CLOSED" && m.state !== "RESOLVED",
  );
  const lastPayment = payments[0];
  const lagHours = Math.round(
    (new Date(lastPayment.recordedAt).getTime() -
      new Date(lastPayment.receivedAt).getTime()) /
      3_600_000,
  );

  return (
    <>
      <TopBar
        title="Overview"
        caption={`${lease.resourceLabel} · ${lease.propertyName} · ${lease.addressLabel}`}
        action={
          <>
            <Button asChild variant="outline" className="rounded-[12px]">
              <Link href="/maintenance">
                <Plus className="size-4" /> Report an issue
              </Link>
            </Button>
            <Button asChild className="rounded-[12px]">
              <Link href="/invoices">
                Pay {peso(outstandingCentavos)} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        }
      />

      <Page>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ---------------------------------------------------- main column */}
          <div className="space-y-5">
            <Panel tone="money" className="overflow-hidden">
              <div className="grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
                <div className="p-7">
                  <p className="label-caps text-money">You owe right now</p>
                  <p className="text-amount text-money mt-2.5 text-[52px] leading-none">
                    {peso(outstandingCentavos)}
                  </p>
                  <p className="text-muted-foreground mt-3 text-[13.5px] leading-relaxed">
                    Across {openInvoices.length} open{" "}
                    {openInvoices.length === 1 ? "invoice" : "invoices"}. An
                    invoice is a claim — this figure is what has been claimed
                    and not yet received.
                  </p>
                </div>

                <div className="border-money/15 divide-money/15 divide-y border-t md:border-t-0 md:border-l">
                  {openInvoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices#${invoice.id}`}
                      className="hover:bg-money/[0.05] group flex items-center justify-between gap-4 px-6 py-[18px] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-medium">
                          {invoice.periodLabel}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[12.5px]">
                          {formatDate(invoice.dueDate)} ·{" "}
                          {relativeDue(invoice.dueDate)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <p className="text-amount text-[16px]">
                            {peso(invoice.totalCentavos - invoice.paidCentavos)}
                          </p>
                          <div className="mt-1 flex justify-end">
                            <InvoiceStatus state={invoice.state} />
                          </div>
                        </div>
                        <ArrowUpRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </Panel>

            {overdue.length > 0 ? (
              <Panel tone="bad" className="p-6">
                <p className="text-[15px] font-semibold">
                  {overdue[0].periodLabel} is {relativeDue(overdue[0].dueDate)}
                </p>
                <p className="text-muted-foreground mt-1.5 text-[14px] leading-relaxed">
                  {peso(overdue[0].paidCentavos)} of{" "}
                  {peso(overdue[0].totalCentavos)} has been received, leaving{" "}
                  <span className="text-foreground font-semibold">
                    {peso(overdue[0].totalCentavos - overdue[0].paidCentavos)}
                  </span>
                  . Pay the balance online, or hand it to staff and they will
                  record it here.
                </p>
              </Panel>
            ) : null}

            <div>
              <SectionHeading
                title="Your last payment"
                caption="When the money moved, and when it appeared here"
                action={
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                  >
                    <Link href="/payments">All payments</Link>
                  </Button>
                }
              />
              <Panel className="p-7">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <p className="text-amount text-[38px] leading-none">
                      {peso(lastPayment.amountCentavos)}
                    </p>
                    <p className="text-muted-foreground mt-2 text-[13.5px]">
                      {lastPayment.origin === "ONLINE"
                        ? `Paid online via ${lastPayment.method}`
                        : `Cash, received by ${lastPayment.recordedBy}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-7">
                    <div>
                      <p className="label-caps text-muted-foreground">
                        Handed over
                      </p>
                      <p className="mt-1 text-[13.5px]">
                        {formatDateTime(lastPayment.receivedAt)}
                      </p>
                    </div>
                    <div className="bg-border h-8 w-px" />
                    <div>
                      <p className="label-caps text-muted-foreground">
                        Appeared here
                      </p>
                      <p className="mt-1 text-[13.5px]">
                        {formatDateTime(lastPayment.recordedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {lastPayment.origin === "OFFLINE_RECORDED" ? (
                  <div className="border-border mt-6 flex gap-3 border-t pt-5">
                    <Clock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <p className="text-muted-foreground text-[13.5px] leading-relaxed">
                      Cash takes as long to appear as it takes staff to record
                      it — about {lagHours} hours here. The platform did not
                      process this money; {lastPayment.recordedBy} confirmed
                      receiving it. If a payment you made is still missing,
                      raise it with the property.
                    </p>
                  </div>
                ) : null}
              </Panel>
            </div>

            <div>
              <SectionHeading
                title="Maintenance"
                caption="Acknowledged means someone has seen it"
                action={
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                  >
                    <Link href="/maintenance">All requests</Link>
                  </Button>
                }
              />
              <Panel className="divide-border divide-y overflow-hidden">
                {openRequests.length === 0 ? (
                  <p className="text-muted-foreground p-6 text-[14px]">
                    Nothing open right now.
                  </p>
                ) : (
                  openRequests.map((request) => (
                    <Link
                      key={request.id}
                      href="/maintenance"
                      className="hover:bg-secondary/50 flex items-center justify-between gap-4 px-6 py-[18px] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14.5px] font-medium">
                          {request.title}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[12.5px]">
                          {request.reference} · updated{" "}
                          {formatDate(request.lastUpdate)}
                        </p>
                      </div>
                      <MaintenanceStatus state={request.state} />
                    </Link>
                  ))
                )}
              </Panel>
            </div>
          </div>

          {/* ---------------------------------------------------- side column */}
          <aside className="space-y-5">
            <Panel className="overflow-hidden p-0">
              <div className="relative h-[150px]">
                <Photo
                  src={propertyPhoto}
                  alt={`${lease.resourceLabel}, ${lease.propertyName}`}
                  className="absolute inset-0 h-full w-full"
                  sizes="340px"
                  priority
                />
                <div className="scrim-card absolute inset-0" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="glass label-caps inline-flex rounded-full px-2.5 py-1">
                    {lease.state === "ACTIVE" ? "Active lease" : "Notice given"}
                  </span>
                  <p className="mt-2 text-[18px] leading-tight font-semibold text-white">
                    {lease.resourceLabel}
                  </p>
                  <p className="truncate text-[13px] text-white/75">
                    {lease.propertyName}
                  </p>
                </div>
              </div>

              <div className="p-5">
                <dl className="space-y-3 text-[13.5px]">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">Rent</dt>
                    <dd className="text-amount text-[15px]">
                      {peso(lease.monthlyRentCentavos)}
                      <span className="text-muted-foreground text-[12.5px] font-normal">
                        /mo
                      </span>
                    </dd>
                  </div>
                  <div className="border-border flex items-baseline justify-between gap-4 border-t pt-3">
                    <dt className="text-muted-foreground">Due each month</dt>
                    <dd>the {lease.billingDay}th</dd>
                  </div>
                  <div className="border-border flex items-baseline justify-between gap-4 border-t pt-3">
                    <dt className="text-muted-foreground">Term ends</dt>
                    <dd>{formatDate(lease.endDate)}</dd>
                  </div>
                  <div className="border-border flex items-baseline justify-between gap-4 border-t pt-3">
                    <dt className="text-muted-foreground">Deposit held</dt>
                    <dd className="text-amount text-[15px]">
                      {peso(lease.deposit.heldCentavos)}
                    </dd>
                  </div>
                </dl>

                <Button
                  asChild
                  variant="outline"
                  className="mt-5 w-full rounded-[12px]"
                >
                  <Link href="/lease">Lease and deposit</Link>
                </Button>
              </div>
            </Panel>

            <Panel className="p-5">
              <p className="label-caps text-muted-foreground">
                Paying in cash?
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed">
                Hand it to property staff and they will record it here, with
                their name and the date attached.
              </p>
              <p className="text-muted-foreground mt-3 text-[12.5px] leading-relaxed">
                You cannot record your own payment — a person cannot attest to
                their own cash.
              </p>
            </Panel>
          </aside>
        </div>
      </Page>
    </>
  );
}
