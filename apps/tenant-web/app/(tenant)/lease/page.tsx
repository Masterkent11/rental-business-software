import { Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Page, PageHeader } from "@/components/tenant/shell";
import { Pill } from "@/components/tenant/status";
import { lease } from "@/lib/fixtures";
import { daysFromToday, formatDate, peso } from "@/lib/money";

/**
 * The lease.
 *
 * "Not having a copy of your own rental agreement" is one of the concrete pains
 * this product exists to fix, so a tenant must always be able to see their own
 * lease — terms, money, and the deposit that is theirs.
 *
 * The deposit is shown as **held money with its own lifecycle** (U-02), not as
 * a paid invoice. At move-out this becomes the last impression the product
 * makes, and an unexplained deduction is the classic dispute — so the shape
 * that supports an itemised settlement is the shape used from day one.
 */
export default function LeasePage() {
  const daysLeft = daysFromToday(lease.endDate);
  const endingSoon = daysLeft <= 90;
  const { deposit } = lease;
  const unsettled =
    deposit.heldCentavos - deposit.appliedCentavos - deposit.returnedCentavos;

  return (
    <Page>
      <PageHeader
        title="Your lease"
        caption={`${lease.reference} · ${lease.organizationName}`}
        action={
          <Button variant="outline">
            <Download className="size-4" /> Lease PDF
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xl font-semibold">
                {lease.resourceLabel}, {lease.propertyName}
              </p>
              <p className="text-muted-foreground text-sm">{lease.addressLabel}</p>
            </div>
            <Pill variant={lease.state === "ACTIVE" ? "ok" : "pending"}>
              {lease.state === "ACTIVE" ? "Active" : "Notice given"}
            </Pill>
          </div>

          <Separator className="my-5" />

          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                Rent
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {peso(lease.monthlyRentCentavos)}
              </dd>
              <p className="text-muted-foreground text-xs">
                due on the {lease.billingDay}th
              </p>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                Term
              </dt>
              <dd className="mt-1 text-sm">
                {formatDate(lease.startDate)} <br />
                {formatDate(lease.endDate)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                On the lease
              </dt>
              <dd className="mt-1 text-sm">{lease.coTenants.join(", ")}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {endingSoon ? (
        <Card className="border-pending/25 bg-pending-soft mt-4">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="text-sm">
              <p className="font-medium">
                Your lease ends in {daysLeft} days
              </p>
              <p className="text-muted-foreground mt-0.5">
                Early enough to decide. Renewing keeps the same lease reference.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm">Request renewal</Button>
              <Button size="sm" variant="outline">
                Give notice
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* U-02 made concrete: a liability the organisation owes back. */}
      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-ok size-4" />
            <p className="text-sm font-medium">Your deposit</p>
          </div>

          <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
            {peso(unsettled)}
          </p>
          <p className="text-muted-foreground text-sm">
            held by {lease.organizationName}
          </p>

          <Separator className="my-5" />

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Held on signing</dt>
              <dd className="tabular-nums">{peso(deposit.heldCentavos)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Applied to arrears or damage</dt>
              <dd className="tabular-nums">{peso(deposit.appliedCentavos)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Returned to you</dt>
              <dd className="tabular-nums">{peso(deposit.returnedCentavos)}</dd>
            </div>
          </dl>

          <p className="text-muted-foreground mt-5 text-xs leading-relaxed">
            This is your money, held — not rent you have already spent. At
            move-out there is an inspection, and anything deducted from it has to
            cite what it is for: an unpaid invoice, or a specific finding from
            that inspection. You will see the itemised settlement here.
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium">Terms</p>
            <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
              {lease.terms.map((term) => (
                <li key={term} className="flex gap-2">
                  <span aria-hidden>·</span>
                  <span>{term}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium">House rules</p>
            <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
              {lease.houseRules.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <span aria-hidden>·</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground mt-8 text-xs leading-relaxed">
        A lease is an agreement, not a form — you can read it and download it,
        but changes are made by the property and shown here.
      </p>
    </Page>
  );
}
