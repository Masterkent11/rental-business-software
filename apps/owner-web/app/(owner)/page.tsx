import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  ClipboardList,
  Plus,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Page,
  Panel,
  SectionHeading,
  TopBar,
} from "@/components/owner/shell";
import {
  CollectionChart,
  OccupancyBar,
  Ring,
  Sparkline,
} from "@/components/owner/charts";
import { OriginPill, Pill } from "@/components/owner/status";
import {
  activity,
  arrears,
  claimedThisMonth,
  collectedThisMonth,
  collection,
  occupancyRate,
  offlineShare,
  outstandingThisMonth,
  pendingApplications,
  pendingListings,
  properties,
  recentPayments,
  totalArrears,
  totalOccupied,
  totalResources,
  totalVacant,
  unacknowledged,
} from "@/lib/fixtures";
import { formatDate, formatDateTime, peso } from "@/lib/money";

/**
 * Owner dashboard.
 *
 * Built around the one sentence the pilot is judged by: *"an owner answers
 * 'who owes me money this month?' from the platform alone."* So collection is
 * the headline, and it is always shown as **claimed against received** — never
 * as a single revenue number, because the gap between the two is the entire
 * question.
 *
 * Below it, the queue: everything waiting on a decision from this person today.
 * A dashboard that shows only figures makes an owner hunt for their own work.
 */
export default function DashboardPage() {
  const collectionPct = Math.round((collectedThisMonth / claimedThisMonth) * 100);
  const attention =
    pendingApplications.length + unacknowledged.length + arrears.length;

  return (
    <>
      <TopBar
        title="Dashboard"
        caption="August 2026 · 3 properties · 50 rentable resources"
        action={
          <>
            <Button variant="outline" className="rounded-[11px]">
              <Banknote className="size-4" /> Record cash payment
            </Button>
            <Button className="rounded-[11px]">
              <Plus className="size-4" /> Add listing
            </Button>
          </>
        }
      />

      <Page>
        {/* ------------------------------------------------------------ KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Panel className="p-5">
            <div className="flex items-start justify-between">
              <p className="label-caps text-muted-foreground">
                Collected in August
              </p>
              <Sparkline
                points={collection.map((c) => c.received)}
                tone="money"
              />
            </div>
            <p className="text-amount mt-3 text-[30px] leading-none">
              {peso(collectedThisMonth)}
            </p>
            <p className="text-muted-foreground mt-2 text-[12.5px]">
              of {peso(claimedThisMonth)} claimed
            </p>
            <div className="bg-secondary mt-3 h-1.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-[var(--color-money)]"
                style={{ width: `${collectionPct}%` }}
              />
            </div>
          </Panel>

          <Panel tone="money" className="p-5">
            <p className="label-caps text-money">Still owed to you</p>
            <p className="text-amount text-money mt-3 text-[30px] leading-none">
              {peso(outstandingThisMonth)}
            </p>
            <p className="text-muted-foreground mt-2 text-[12.5px]">
              {arrears.length} tenants · {peso(totalArrears)} past due
            </p>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="mt-3 w-full rounded-full bg-transparent"
            >
              <Link href="/payments">Who owes me</Link>
            </Button>
          </Panel>

          <Panel className="flex items-center gap-4 p-5">
            <Ring value={occupancyRate} label="occupied" />
            <div className="min-w-0">
              <p className="label-caps text-muted-foreground">Occupancy</p>
              <p className="mt-2 text-[13px]">
                <span className="text-amount text-[17px]">{totalOccupied}</span>
                <span className="text-muted-foreground"> of {totalResources} let</span>
              </p>
              <p className="text-muted-foreground mt-1 text-[12.5px]">
                {totalVacant} vacant, earning nothing
              </p>
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex items-start justify-between">
              <p className="label-caps text-muted-foreground">Cash vs online</p>
              <Sparkline points={[38, 44, 41, 52, 47, offlineShare]} tone="plain" />
            </div>
            <p className="text-amount mt-3 text-[30px] leading-none">
              {offlineShare}%
            </p>
            <p className="text-muted-foreground mt-2 text-[12.5px] leading-relaxed">
              of recent payments were cash recorded by staff, not processed by
              the platform
            </p>
          </Panel>
        </div>

        {/* ------------------------------------------- collection + attention */}
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div>
            <SectionHeading
              title="Claimed against received"
              caption="An invoice is a claim. The gap is what you are chasing."
            />
            <Panel className="p-6">
              <CollectionChart data={collection} />
            </Panel>

            <div className="mt-6">
              <SectionHeading
                title="Occupancy by property"
                action={
                  <Button asChild size="sm" variant="ghost" className="rounded-full">
                    <Link href="/properties">All properties</Link>
                  </Button>
                }
              />
              <Panel className="divide-border divide-y overflow-hidden">
                {properties.map((p) => (
                  <Link
                    key={p.id}
                    href="/properties"
                    className="hover:bg-secondary/40 block px-5 py-4 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-[14.5px] font-medium">
                          {p.name}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[12.5px]">
                          {p.areaLabel}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-amount text-[15px]">
                          {peso(p.monthlyContracted)}
                          <span className="text-muted-foreground text-[12px] font-normal">
                            /mo
                          </span>
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[12px]">
                          of {peso(p.monthlyPotential)} possible
                        </p>
                      </div>
                    </div>

                    <OccupancyBar
                      occupied={p.occupied}
                      reserved={p.reserved}
                      vacant={p.vacant}
                      className="mt-3"
                    />
                    <div className="text-muted-foreground mt-2 flex gap-4 text-[12px]">
                      <span>{p.occupied} occupied</span>
                      <span>{p.reserved} reserved</span>
                      <span className={p.vacant > 0 ? "text-foreground font-medium" : ""}>
                        {p.vacant} vacant
                      </span>
                    </div>
                  </Link>
                ))}
              </Panel>
            </div>
          </div>

          {/* ------------------------------------------------------- queue */}
          <div>
            <SectionHeading
              title="Needs you today"
              caption={`${attention} things waiting on a decision`}
            />

            <div className="space-y-4">
              {unacknowledged.length > 0 ? (
                <Panel tone="bad" className="p-5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-bad size-4" />
                    <p className="text-[14px] font-semibold">
                      {unacknowledged.length} maintenance request
                      {unacknowledged.length === 1 ? "" : "s"} unacknowledged
                    </p>
                  </div>
                  {unacknowledged.map((m) => (
                    <div key={m.id} className="mt-3">
                      <p className="text-[13.5px]">{m.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-[12.5px]">
                        {m.resourceLabel} · {m.propertyName} · reported by{" "}
                        {m.reportedBy}
                      </p>
                    </div>
                  ))}
                  <p className="text-muted-foreground mt-3 text-[12px] leading-relaxed">
                    Acknowledging matters as much as fixing — an unacknowledged
                    request feels ignored even when work has started.
                  </p>
                  <Button asChild size="sm" className="mt-3 w-full rounded-full">
                    <Link href="/maintenance">
                      Acknowledge <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </Panel>
              ) : null}

              <Panel className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="text-muted-foreground size-4" />
                    <p className="text-[14px] font-semibold">
                      {pendingApplications.length} applications to review
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2.5">
                  {pendingApplications.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium">
                          {a.applicant}
                        </p>
                        <p className="text-muted-foreground text-[12px]">
                          {a.resourceLabel} · move-in {formatDate(a.moveIn)}
                        </p>
                      </div>
                      <Pill variant="pending">{a.documents} docs</Pill>
                    </div>
                  ))}
                </div>

                <p className="text-muted-foreground mt-3 text-[12px] leading-relaxed">
                  Two people applied for Unit 203. Approving one places the hold
                  — until then it stays on the market.
                </p>

                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full rounded-full"
                >
                  <Link href="/applications">Review applications</Link>
                </Button>
              </Panel>

              {pendingListings.length > 0 ? (
                <Panel tone="pending" className="p-5">
                  <p className="text-[14px] font-semibold">
                    {pendingListings.length} listing awaiting platform approval
                  </p>
                  <p className="text-muted-foreground mt-1.5 text-[12.5px] leading-relaxed">
                    {pendingListings[0].title} — submitted, not yet public.
                    Nothing goes live without review.
                  </p>
                </Panel>
              ) : null}

              <Panel className="p-5">
                <div className="flex items-center gap-2">
                  <Wrench className="text-muted-foreground size-4" />
                  <p className="text-[14px] font-semibold">Recent activity</p>
                </div>
                <ul className="mt-3 space-y-3">
                  {activity.slice(0, 5).map((item) => (
                    <li key={item.id} className="flex gap-3">
                      <span className="bg-border mt-1.5 size-1.5 shrink-0 rounded-full" />
                      <div className="min-w-0">
                        <p className="text-[13px] leading-snug">{item.text}</p>
                        {item.detail ? (
                          <p className="text-muted-foreground mt-0.5 text-[12px]">
                            {item.detail}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------- recent money */}
        <div className="mt-8">
          <SectionHeading
            title="Money in"
            caption="Online payments the platform processed, and cash staff recorded — never shown as the same thing"
            action={
              <Button asChild size="sm" variant="ghost" className="rounded-full">
                <Link href="/payments">All payments</Link>
              </Button>
            }
          />
          <Panel className="overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-border text-muted-foreground border-b">
                  <th className="label-caps px-5 py-2.5 font-semibold">Tenant</th>
                  <th className="label-caps hidden px-5 py-2.5 font-semibold md:table-cell">
                    Resource
                  </th>
                  <th className="label-caps px-5 py-2.5 text-right font-semibold">
                    Amount
                  </th>
                  <th className="label-caps px-5 py-2.5 font-semibold">How</th>
                  <th className="label-caps hidden px-5 py-2.5 font-semibold lg:table-cell">
                    Money moved
                  </th>
                  <th className="label-caps hidden px-5 py-2.5 font-semibold lg:table-cell">
                    Recorded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-[13.5px] font-medium">{p.tenant}</p>
                      <p className="text-muted-foreground font-mono text-[11px]">
                        {p.reference}
                      </p>
                    </td>
                    <td className="text-muted-foreground hidden px-5 py-3 text-[13px] md:table-cell">
                      {p.resourceLabel}
                    </td>
                    <td className="text-amount px-5 py-3 text-right text-[14px]">
                      {peso(p.amountCentavos)}
                    </td>
                    <td className="px-5 py-3">
                      <OriginPill
                        origin={p.origin}
                        method={p.method}
                        recordedBy={p.recordedBy}
                      />
                    </td>
                    <td className="text-muted-foreground hidden px-5 py-3 text-[12.5px] lg:table-cell">
                      {formatDateTime(p.receivedAt)}
                    </td>
                    <td className="hidden px-5 py-3 text-[12.5px] lg:table-cell">
                      <span
                        className={
                          p.receivedAt === p.recordedAt
                            ? "text-muted-foreground"
                            : "text-money"
                        }
                      >
                        {formatDateTime(p.recordedAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      </Page>
    </>
  );
}
