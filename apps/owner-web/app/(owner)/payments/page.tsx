"use client";

import { useEffect } from "react";
import { CheckCircle2, Download, Wallet } from "lucide-react";

import { Page, SectionHeading, TableScroll, TopBar } from "@/components/owner/shell";
import { Badge, Btn, Card, EmptyState, ErrorState, Skeleton, Stat } from "@/components/owner/ui";
import { formatDateTime, formatMonthYear, peso } from "@/lib/money";
import { downloadCsv } from "@/lib/csv";
import { useSessionStore } from "@/stores/use-session-store";
import { useDashboardStore } from "@/stores/use-dashboard-store";
import type { Collection } from "@/domain/payments/collection";

function exportPayments(collection: Collection) {
  downloadCsv(`payments-${collection.month}.csv`, [
    ["Tenant", "Unit", "Amount (PHP)", "Origin", "Recorded at", "Reference"],
    ...collection.recentPayments.map((p) => [
      p.tenantName,
      p.resourceLabel,
      (p.amountCentavos / 100).toFixed(2),
      p.origin === "ONLINE" ? "Online" : `Cash (${p.recordedBy ?? "staff"})`,
      p.recordedAt,
      p.reference ?? p.id,
    ]),
  ]);
}

export default function PaymentsPage() {
  const organizationId = useSessionStore((s) => s.activeOrganizationId);
  const { collection, collectionLoading, collectionError, loadCollection } = useDashboardStore();

  useEffect(() => {
    if (organizationId) void loadCollection(organizationId);
  }, [organizationId, loadCollection]);

  if (collectionError && !collection) {
    return (
      <Page>
        <TopBar title="Payments" />
        <Card><ErrorState message={collectionError} onRetry={() => organizationId && void loadCollection(organizationId)} /></Card>
      </Page>
    );
  }

  if (!collection) {
    return (
      <Page>
        <TopBar title="Payments" caption="Loading collections…" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-2xl" />)}
        </div>
      </Page>
    );
  }

  const totalArrears = collection.arrears.reduce((n, a) => n + a.owedCentavos, 0);
  const rate = collection.claimedCentavos > 0 ? Math.round((collection.receivedCentavos / collection.claimedCentavos) * 100) : 0;

  return (
    <Page>
      <TopBar title="Payments" caption={`Collections for ${formatMonthYear(collection.month)}. Nightly bookings are prepaid in the app; monthly rent is invoiced.`}>
        <Btn variant="outline" size="sm" disabled={collection.recentPayments.length === 0} onClick={() => exportPayments(collection)}>
          <Download className="size-4" aria-hidden /> Export CSV
        </Btn>
      </TopBar>
      <div className={collectionLoading ? "opacity-60" : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Invoiced this month" value={peso(collection.claimedCentavos)} hint="Rent and utilities billed" />
          <Stat label="Received" value={peso(collection.receivedCentavos)} hint={`${rate}% of invoiced`} />
          <Stat label="Overdue" value={peso(totalArrears)} hint={`${collection.arrears.length} tenanc${collection.arrears.length === 1 ? "y" : "ies"}`} />
          <Stat label="Cash share" value={`${collection.offlineSharePercent}%`} hint="Recorded by staff in person" />
        </div>

        <section className="mt-8">
          <SectionHeading title="Overdue balances" caption="Unsettled invoices past their due date" />
          <Card>
            {collection.arrears.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="size-5" aria-hidden />} title="Nothing overdue" body="Every tenant account is current for this billing cycle." />
            ) : (
              <TableScroll>
                <table className="w-full min-w-[620px] text-left text-[13.5px]">
                  <thead className="border-b border-border text-[12px] text-muted">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Tenant</th>
                      <th scope="col" className="px-5 py-3 font-medium">Unit</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Owed</th>
                      <th scope="col" className="px-5 py-3 font-medium">Invoices</th>
                      <th scope="col" className="px-5 py-3 font-medium">Oldest due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {collection.arrears.map((a) => (
                      <tr key={a.occupancyId}>
                        <td className="px-5 py-3.5 font-semibold">{a.tenantName}</td>
                        <td className="px-5 py-3.5 text-muted">{a.resourceLabel}</td>
                        <td className="tabular px-5 py-3.5 text-right font-semibold text-danger">{peso(a.owedCentavos)}</td>
                        <td className="px-5 py-3.5"><Badge>{a.invoiceCount} unpaid</Badge></td>
                        <td className="px-5 py-3.5 text-muted">{a.oldestDueOn} · {a.daysOverdue}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Card>
        </section>

        <section className="mt-8">
          <SectionHeading title="Recent payments" caption="Online payments and staff-recorded cash are shown separately" />
          <Card>
            {collection.recentPayments.length === 0 ? (
              <EmptyState icon={<Wallet className="size-5" aria-hidden />} title="No payments this period" body="Paid bookings and recorded rent show up here." />
            ) : (
              <TableScroll>
                <table className="w-full min-w-[720px] text-left text-[13.5px]">
                  <thead className="border-b border-border text-[12px] text-muted">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Payer</th>
                      <th scope="col" className="px-5 py-3 font-medium">Unit</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Amount</th>
                      <th scope="col" className="px-5 py-3 font-medium">Origin</th>
                      <th scope="col" className="px-5 py-3 font-medium">Recorded</th>
                      <th scope="col" className="px-5 py-3 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {collection.recentPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-5 py-3.5 font-semibold">{p.tenantName || "Guest"}</td>
                        <td className="px-5 py-3.5 text-muted">{p.resourceLabel}</td>
                        <td className="tabular px-5 py-3.5 text-right font-semibold">{peso(p.amountCentavos)}</td>
                        <td className="px-5 py-3.5">
                          {p.origin === "ONLINE" ? <Badge tone="ok">Online</Badge> : <Badge>Cash · {p.recordedBy ?? "staff"}</Badge>}
                        </td>
                        <td className="px-5 py-3.5 text-muted">{formatDateTime(p.recordedAt)}</td>
                        <td className="px-5 py-3.5 font-mono text-[12px] text-muted">{p.reference ?? p.id.slice(0, 12)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Card>
        </section>
      </div>
    </Page>
  );
}
