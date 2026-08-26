import { AlertCircle, Banknote, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Page,
  Panel,
  SectionHeading,
  TableScroll,
  TopBar,
} from "@/components/owner/shell";
import { OriginPill, Pill } from "@/components/owner/status";
import {
  arrears,
  claimedThisMonth,
  collectedThisMonth,
  offlineShare,
  outstandingThisMonth,
  recentPayments,
  totalArrears,
} from "@/lib/fixtures";
import { formatDate, formatDateTime, peso } from "@/lib/money";

/**
 * Payments.
 *
 * This screen answers the sentence the pilot is judged by — *"who owes me money
 * this month?"* — and it can only answer it because an invoice is a claim and a
 * payment is money, and the two are never the same record.
 *
 * The second column of the payments table is the one that matters: **money
 * moved** against **recorded**. For an online payment they are the same
 * instant. For cash they are not, and the gap is a staff performance signal the
 * owner otherwise has no way to see.
 */
export default function PaymentsPage() {
  return (
    <>
      <TopBar
        title="Payments"
        caption="August 2026"
        action={
          <>
            <Button variant="outline" className="rounded-[11px]">
              <Download className="size-4" /> Export
            </Button>
            <Button className="rounded-[11px]">
              <Banknote className="size-4" /> Record cash payment
            </Button>
          </>
        }
      />

      <Page>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Panel className="p-5">
            <p className="label-caps text-muted-foreground">Claimed</p>
            <p className="text-amount mt-2 text-[28px] leading-none">
              {peso(claimedThisMonth)}
            </p>
          </Panel>
          <Panel className="p-5">
            <p className="label-caps text-muted-foreground">Received</p>
            <p className="text-amount mt-2 text-[28px] leading-none">
              {peso(collectedThisMonth)}
            </p>
          </Panel>
          <Panel tone="money" className="p-5">
            <p className="label-caps text-money">Still owed</p>
            <p className="text-amount text-money mt-2 text-[28px] leading-none">
              {peso(outstandingThisMonth)}
            </p>
          </Panel>
          <Panel className="p-5">
            <p className="label-caps text-muted-foreground">Paid in cash</p>
            <p className="text-amount mt-2 text-[28px] leading-none">
              {offlineShare}%
            </p>
          </Panel>
        </div>

        <div className="mt-8">
          <SectionHeading
            title="Who owes you"
            caption={`${arrears.length} tenants · ${peso(totalArrears)} past due`}
          />
          <Panel className="overflow-hidden">
            <TableScroll>
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-border text-muted-foreground border-b">
                    <th className="label-caps px-5 py-2.5 font-semibold">
                      Tenant
                    </th>
                    <th className="label-caps hidden px-5 py-2.5 font-semibold md:table-cell">
                      Resource
                    </th>
                    <th className="label-caps px-5 py-2.5 text-right font-semibold">
                      Owed
                    </th>
                    <th className="label-caps px-5 py-2.5 font-semibold">
                      Age
                    </th>
                    <th className="label-caps hidden px-5 py-2.5 font-semibold lg:table-cell">
                      Last contact
                    </th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {arrears.map((a) => (
                    <tr
                      key={a.id}
                      className="hover:bg-secondary/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-[13.5px] font-medium">
                        {a.tenant}
                      </td>
                      <td className="text-muted-foreground hidden px-5 py-3.5 text-[13px] md:table-cell">
                        {a.resourceLabel} · {a.propertyName}
                      </td>
                      <td className="text-amount text-money px-5 py-3.5 text-right text-[14.5px]">
                        {peso(a.owedCentavos)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Pill variant={a.daysOverdue >= 15 ? "bad" : "pending"}>
                          {a.daysOverdue} days
                        </Pill>
                      </td>
                      <td className="text-muted-foreground hidden px-5 py-3.5 text-[12.5px] lg:table-cell">
                        {a.lastContact ? (
                          formatDate(a.lastContact)
                        ) : (
                          <span className="text-bad">never</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                        >
                          Send reminder
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Panel>
        </div>

        <div className="mt-8">
          <SectionHeading
            title="Money in"
            caption="Two kinds of evidence, kept apart on purpose"
          />
          <Panel className="overflow-hidden">
            <TableScroll>
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-border text-muted-foreground border-b">
                    <th className="label-caps px-5 py-2.5 font-semibold">
                      Tenant
                    </th>
                    <th className="label-caps px-5 py-2.5 text-right font-semibold">
                      Amount
                    </th>
                    <th className="label-caps px-5 py-2.5 font-semibold">
                      How
                    </th>
                    <th className="label-caps hidden px-5 py-2.5 font-semibold lg:table-cell">
                      Money moved
                    </th>
                    <th className="label-caps hidden px-5 py-2.5 font-semibold lg:table-cell">
                      Recorded
                    </th>
                    <th className="label-caps px-5 py-2.5 font-semibold">
                      Lag
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {recentPayments.map((p) => {
                    const lagH = Math.round(
                      (new Date(p.recordedAt).getTime() -
                        new Date(p.receivedAt).getTime()) /
                        3_600_000,
                    );
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-secondary/40 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-[13.5px] font-medium">
                            {p.tenant}
                          </p>
                          <p className="text-muted-foreground font-mono text-[11px]">
                            {p.reference}
                          </p>
                        </td>
                        <td className="text-amount px-5 py-3.5 text-right text-[14px]">
                          {peso(p.amountCentavos)}
                        </td>
                        <td className="px-5 py-3.5">
                          <OriginPill
                            origin={p.origin}
                            method={p.method}
                            recordedBy={p.recordedBy}
                          />
                        </td>
                        <td className="text-muted-foreground hidden px-5 py-3.5 text-[12.5px] lg:table-cell">
                          {formatDateTime(p.receivedAt)}
                        </td>
                        <td className="text-muted-foreground hidden px-5 py-3.5 text-[12.5px] lg:table-cell">
                          {formatDateTime(p.recordedAt)}
                        </td>
                        <td className="px-5 py-3.5">
                          {lagH === 0 ? (
                            <span className="text-muted-foreground text-[12.5px]">
                              —
                            </span>
                          ) : (
                            <Pill variant={lagH > 24 ? "money" : "neutral"}>
                              {lagH}h
                            </Pill>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          </Panel>
        </div>

        <Panel className="mt-5 flex gap-3 p-5">
          <AlertCircle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground max-w-3xl text-[12.5px] leading-relaxed">
            Cash recorded by staff is not a payment the platform processed — it
            is a staff member&rsquo;s attestation that money changed hands. It
            settles the invoice and issues a receipt exactly like an online
            payment, and it can never be presented as one. Reconciliation
            against provider settlements covers online payments only; including
            cash would produce a reconciliation that never balances.
          </p>
        </Panel>
      </Page>
    </>
  );
}
