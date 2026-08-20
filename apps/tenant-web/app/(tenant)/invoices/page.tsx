import { Button } from "@/components/ui/button";
import { Page, Panel, TopBar } from "@/components/tenant/shell";
import { InvoiceStatus } from "@/components/tenant/status";
import { invoices, openInvoices, outstandingCentavos } from "@/lib/fixtures";
import { formatDate, peso, relativeDue } from "@/lib/money";

/**
 * Invoices.
 *
 * A table, because this is a ledger a person scans down a column — the web
 * idiom, not a stack of cards borrowed from a phone.
 *
 * An invoice is a **claim, not money**, so every row carries claimed, received,
 * and still owed as three separate figures. This screen never says "unpaid" and
 * leaves it at that: partial payment is common here, and a flat label is how a
 * tenant loses track of their own money.
 */
export default function InvoicesPage() {
  const settledStates = new Set(["PAID", "WAIVED"]);

  return (
    <>
      <TopBar
        title="Invoices"
        caption="Every claim raised against your lease"
        action={
          openInvoices.length > 0 ? (
            <Button className="rounded-[12px]">
              Pay {peso(outstandingCentavos)}
            </Button>
          ) : null
        }
      />

      <Page>
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Panel tone="money" className="p-5">
            <p className="label-caps text-money">Outstanding</p>
            <p className="text-amount text-money mt-2 text-[32px] leading-none">
              {peso(outstandingCentavos)}
            </p>
          </Panel>
          <Panel className="p-5">
            <p className="label-caps text-muted-foreground">Open invoices</p>
            <p className="text-amount mt-2 text-[32px] leading-none">
              {openInvoices.length}
            </p>
          </Panel>
          <Panel className="p-5">
            <p className="label-caps text-muted-foreground">
              Settled this lease
            </p>
            <p className="text-amount mt-2 text-[32px] leading-none">
              {invoices.filter((i) => settledStates.has(i.state)).length}
            </p>
          </Panel>
        </div>

        <Panel className="overflow-hidden p-0">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-border text-muted-foreground border-b">
                <th className="label-caps px-6 py-3 font-semibold">Period</th>
                <th className="label-caps hidden px-6 py-3 font-semibold md:table-cell">
                  Due
                </th>
                <th className="label-caps px-6 py-3 text-right font-semibold">
                  Claimed
                </th>
                <th className="label-caps hidden px-6 py-3 text-right font-semibold sm:table-cell">
                  Received
                </th>
                <th className="label-caps px-6 py-3 text-right font-semibold">
                  Still owed
                </th>
                <th className="label-caps px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {invoices.map((invoice) => {
                const remaining = invoice.totalCentavos - invoice.paidCentavos;
                const settled = settledStates.has(invoice.state);

                return (
                  <tr
                    key={invoice.id}
                    id={invoice.id}
                    className="hover:bg-secondary/40 scroll-mt-24 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-[14.5px] font-medium">
                        {invoice.periodLabel}
                      </p>
                      <p className="text-muted-foreground mt-0.5 font-mono text-[11.5px]">
                        {invoice.reference}
                      </p>
                      {invoice.lines.length > 1 ? (
                        <p className="text-muted-foreground mt-1 text-[12.5px]">
                          {invoice.lines.map((l) => l.label).join(" · ")}
                        </p>
                      ) : null}
                      {invoice.state === "WAIVED" && invoice.waivedReason ? (
                        <p className="text-muted-foreground mt-1.5 max-w-md text-[12.5px] leading-relaxed">
                          {invoice.waivedReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="hidden px-6 py-4 md:table-cell">
                      <p className="text-[13.5px]">
                        {formatDate(invoice.dueDate)}
                      </p>
                      {!settled ? (
                        <p
                          className={
                            invoice.state === "OVERDUE"
                              ? "text-bad mt-0.5 text-[12.5px]"
                              : "text-muted-foreground mt-0.5 text-[12.5px]"
                          }
                        >
                          {relativeDue(invoice.dueDate)}
                        </p>
                      ) : null}
                    </td>
                    <td className="text-amount px-6 py-4 text-right text-[14px]">
                      {peso(invoice.totalCentavos)}
                    </td>
                    <td className="text-amount hidden px-6 py-4 text-right text-[14px] sm:table-cell">
                      {invoice.paidCentavos > 0 ? (
                        peso(invoice.paidCentavos)
                      ) : (
                        <span className="text-muted-foreground font-normal">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {remaining > 0 && !settled ? (
                        <span className="text-amount text-money text-[15px]">
                          {peso(remaining)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[14px]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <InvoiceStatus state={invoice.state} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!settled ? (
                        <Button size="sm" className="rounded-full">
                          Pay
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <p className="text-muted-foreground mt-5 max-w-2xl text-[13px] leading-relaxed">
          Paying in cash? Hand it to property staff and they will record it here
          against the invoice, with their name and the date attached. You cannot
          record your own payment — a person cannot attest to their own cash.
        </p>
      </Page>
    </>
  );
}
