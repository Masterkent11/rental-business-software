"use client";

import { useEffect } from "react";
import {
  CheckCircle2,
  Download,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
} from "@heroui/react";

import {
  Page,
  SectionHeading,
  TableScroll,
  TopBar,
} from "@/components/owner/shell";
import { OriginPill } from "@/components/owner/status";
import { formatDateTime, formatMonthYear, peso } from "@/lib/money";
import { useSessionStore } from "@/stores/use-session-store";
import { useDashboardStore } from "@/stores/use-dashboard-store";
import type { Collection } from "@/domain/payments/collection";

export default function PaymentsPage() {
  const activeOrganizationId = useSessionStore((state) => state.activeOrganizationId);
  const { collection, loading, error, loadCollection } = useDashboardStore();

  useEffect(() => {
    if (activeOrganizationId) {
      void loadCollection(activeOrganizationId);
    }
  }, [activeOrganizationId, loadCollection]);

  if (loading || !collection) {
    return (
      <>
        <TopBar title="Financial Collections" />
        <Page>
          <div className="p-8 text-center">
            {error ? (
              <p className="text-red-500 text-[14px] font-medium">{error}</p>
            ) : (
              <>
                <div className="inline-block size-6 animate-spin rounded-full border-2 border-accent border-t-transparent mb-3" />
                <p className="text-muted-foreground text-[14px] font-medium">
                  Loading financial transactions…
                </p>
              </>
            )}
          </div>
        </Page>
      </>
    );
  }

  return <Payments collection={collection} />;
}

function Payments({ collection }: { collection: Collection }) {
  const totalArrears = collection.arrears.reduce(
    (n, a) => n + a.owedCentavos,
    0,
  );

  const collectionRate =
    collection.claimedCentavos > 0
      ? Math.round(
          (collection.receivedCentavos / collection.claimedCentavos) * 100,
        )
      : 0;

  return (
    <>
      <TopBar
        title="Financial Collections"
        caption={`Collections ledger for ${formatMonthYear(collection.month)} · Real-time gateway & cash reconciliation`}
      >
        <Button
          size="sm"
          className="rounded-xl font-bold h-9 shadow-xs flex items-center gap-2 text-[12.5px] border border-border"
        >
          <Download className="size-4" />
          <span>Export CSV Report</span>
        </Button>
      </TopBar>

      <Page>
        {/* Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5.5 rounded-2xl border border-border/80 bg-surface shadow-xs">
            <span className="label-caps text-muted-foreground font-bold">
              Total Invoiced ({formatMonthYear(collection.month)})
            </span>
            <p className="text-amount mt-3 text-[26px] font-extrabold tracking-tight text-foreground">
              {peso(collection.claimedCentavos)}
            </p>
            <p className="text-muted-foreground text-[12px] font-medium mt-1">
              Active rent & utility billings
            </p>
          </Card>

          <Card className="p-5.5 rounded-2xl border border-border/80 bg-surface shadow-xs">
            <div className="flex items-center justify-between">
              <span className="label-caps text-muted-foreground font-bold">
                Realized Collection
              </span>
              <Chip size="sm" color="success" variant="soft" className="font-bold text-[11px]">
                {collectionRate}% Collected
              </Chip>
            </div>
            <p className="text-amount mt-3 text-[26px] font-extrabold tracking-tight text-emerald-600">
              {peso(collection.receivedCentavos)}
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
          </Card>

          <Card className="p-5.5 rounded-2xl border border-border/80 bg-surface shadow-xs">
            <div className="flex items-center justify-between">
              <span className="label-caps text-muted-foreground font-bold">
                Overdue This Month
              </span>
              <Chip size="sm" color={totalArrears > 0 ? "danger" : "success"} variant="soft" className="font-bold text-[11px]">
                {collection.arrears.length} tenancies
              </Chip>
            </div>
            <p className="text-amount mt-3 text-[26px] font-extrabold tracking-tight text-rose-600">
              {peso(totalArrears)}
            </p>
            <p className="text-muted-foreground text-[12px] font-medium mt-1">
              Requires payment follow-up
            </p>
          </Card>

          <Card className="p-5.5 rounded-2xl border border-border/80 bg-surface shadow-xs">
            <span className="label-caps text-muted-foreground font-bold">
              Offline Cash Ratio
            </span>
            <p className="text-amount mt-3 text-[26px] font-extrabold tracking-tight text-foreground">
              {collection.offlineSharePercent}%
            </p>
            <p className="text-muted-foreground text-[12px] font-medium mt-1">
              Collected via staff in-person
            </p>
          </Card>
        </div>

        {/* Arrears Section */}
        <div>
          <SectionHeading
            title="Overdue Arrears Aging"
            caption="Unsettled balances past the scheduled grace period"
          />
          {collection.arrears.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl border border-border/80 bg-surface">
              <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-[15px] font-bold text-foreground">Zero outstanding arrears</p>
              <p className="text-muted-foreground text-[13px] mt-0.5">
                All tenant accounts are current and up to date for this billing cycle.
              </p>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-border/80 bg-surface shadow-xs overflow-hidden">
              <TableScroll>
                <table className="w-full min-w-[600px] border-collapse text-left">
                  <thead>
                    <tr className="border-border/80 border-b bg-surface-secondary/40 text-muted-foreground">
                      <th className="label-caps px-5 py-3.5 font-bold">Tenant Name</th>
                      <th className="label-caps px-5 py-3.5 font-bold">Unit / Resource</th>
                      <th className="label-caps px-5 py-3.5 text-right font-bold">Overdue Amount</th>
                      <th className="label-caps px-5 py-3.5 font-bold">Invoices</th>
                      <th className="label-caps px-5 py-3.5 font-bold">Oldest Due Date</th>
                      <th className="label-caps px-5 py-3.5 text-right font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/60 divide-y">
                    {collection.arrears.map((a) => (
                      <tr key={a.occupancyId} className="hover:bg-surface-secondary/30 transition-colors">
                        <td className="px-5 py-4 font-bold text-foreground text-[14px]">
                          {a.tenantName}
                        </td>
                        <td className="px-5 py-4 text-[13px] text-muted-foreground font-medium">
                          {a.resourceLabel}
                        </td>
                        <td className="text-amount px-5 py-4 text-right text-[15px] font-bold text-rose-600">
                          {peso(a.owedCentavos)}
                        </td>
                        <td className="px-5 py-4">
                          <Chip size="sm" variant="soft" className="font-bold text-[11px]">
                            {a.invoiceCount} unpaid
                          </Chip>
                        </td>
                        <td className="px-5 py-4 text-[13px] text-muted-foreground font-medium">
                          {a.oldestDueOn} ({a.daysOverdue}d ago)
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button size="sm" variant="outline" className="rounded-xl font-bold h-8 text-[12px]">
                            Send SMS Notice
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Card>
          )}
        </div>

        {/* Verified Payments */}
        <div>
          <SectionHeading
            title="Reconciled Payments Ledger"
            caption="Direct gateway settlements and staff-verified physical receipts"
          />
          {collection.recentPayments.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl border border-border/80 bg-surface">
              <p className="text-muted-foreground text-[13.5px]">No payments on record for this period.</p>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-border/80 bg-surface shadow-xs overflow-hidden">
              <TableScroll>
                <table className="w-full min-w-[700px] border-collapse text-left">
                  <thead>
                    <tr className="border-border/80 border-b bg-surface-secondary/40 text-muted-foreground">
                      <th className="label-caps px-5 py-3.5 font-bold">Tenant</th>
                      <th className="label-caps px-5 py-3.5 font-bold">Unit</th>
                      <th className="label-caps px-5 py-3.5 text-right font-bold">Amount Paid</th>
                      <th className="label-caps px-5 py-3.5 font-bold">Method / Origin</th>
                      <th className="label-caps px-5 py-3.5 font-bold">Recorded At</th>
                      <th className="label-caps px-5 py-3.5 font-bold">Reference / ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/60 divide-y">
                    {collection.recentPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-secondary/30 transition-colors">
                        <td className="px-5 py-4 text-[14px] font-bold text-foreground">
                          {p.tenantName}
                        </td>
                        <td className="px-5 py-4 text-[13px] text-muted-foreground font-medium">
                          {p.resourceLabel}
                        </td>
                        <td className="text-amount px-5 py-4 text-right text-[15px] font-bold text-foreground">
                          {peso(p.amountCentavos)}
                        </td>
                        <td className="px-5 py-4">
                          <OriginPill
                            origin={p.origin}
                            recordedBy={p.recordedBy ?? undefined}
                          />
                        </td>
                        <td className="px-5 py-4 text-[13px] text-muted-foreground font-medium">
                          {formatDateTime(p.recordedAt)}
                        </td>
                        <td className="px-5 py-4 font-mono text-[12px] text-muted-foreground">
                          {p.reference ?? p.id.slice(0, 12)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Card>
          )}
        </div>
      </Page>
    </>
  );
}
