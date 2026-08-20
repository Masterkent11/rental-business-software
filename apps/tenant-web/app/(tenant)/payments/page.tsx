import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Page, PageHeader } from "@/components/tenant/shell";
import { OriginBadge } from "@/components/tenant/status";
import { documents, payments } from "@/lib/fixtures";
import { formatDate, formatDateTime, peso } from "@/lib/money";

/**
 * Payments and documents.
 *
 * The point of this screen is that *"did I pay last month?"* stops being an
 * argument and becomes a lookup.
 *
 * Two fields carry most of the weight, and both come from the domain rather
 * than from a timestamp: **when the money moved** and **when it was recorded**.
 * For an online payment they are the same instant. For cash they are not, and
 * showing both is what makes a delay ordinary instead of suspicious.
 */
export default function PaymentsPage() {
  return (
    <Page>
      <PageHeader
        title="Payments"
        caption="Every peso received, and the receipt for it"
      />

      <div className="space-y-4">
        {payments.map((payment) => (
          <Card key={payment.id}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">
                    {peso(payment.amountCentavos)}
                  </p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {payment.reference} · applied to {payment.appliedTo}
                  </p>
                </div>
                <OriginBadge origin={payment.origin} />
              </div>

              <Separator className="my-4" />

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-muted-foreground">Money moved</dt>
                  <dd className="sm:mt-0.5">{formatDateTime(payment.receivedAt)}</dd>
                </div>
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-muted-foreground">Recorded here</dt>
                  <dd className="sm:mt-0.5">{formatDateTime(payment.recordedAt)}</dd>
                </div>
                {payment.origin === "ONLINE" ? (
                  <div className="flex justify-between gap-4 sm:block">
                    <dt className="text-muted-foreground">Method</dt>
                    <dd className="sm:mt-0.5">{payment.method}</dd>
                  </div>
                ) : (
                  <div className="flex justify-between gap-4 sm:block">
                    <dt className="text-muted-foreground">Received by</dt>
                    <dd className="sm:mt-0.5">{payment.recordedBy}</dd>
                  </div>
                )}
              </dl>

              <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
                {payment.origin === "ONLINE"
                  ? "Processed by the platform through your payment provider, and independently verifiable."
                  : `The platform did not process this money. ${payment.recordedBy} confirmed receiving it in cash, and that record is permanent — corrections are added, never edited away.`}
              </p>

              <Button variant="outline" size="sm" className="mt-4">
                <Download className="size-4" /> Receipt
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold tracking-tight">Documents</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Yours to keep, retrievable months later without asking anyone.
      </p>

      <Card className="mt-4">
        <CardContent className="p-0">
          <ul className="divide-border divide-y">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {doc.kind} · {formatDate(doc.issuedAt)} · {doc.sizeLabel}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Download ${doc.name}`}>
                  <Download className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Page>
  );
}
