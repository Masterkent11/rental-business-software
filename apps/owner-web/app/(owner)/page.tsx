"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  ClipboardList,
  Plus,
} from "lucide-react";
import { Button, Card, Chip, Meter, Separator, Table } from "@heroui/react";

import {
  ButtonLink,
  Page,
  SectionHeading,
  TopBar,
} from "@/components/owner/shell";
import {
  CollectionChart,
  OccupancyDonut,
  Trend,
} from "@/components/owner/nivo";
import { OriginPill } from "@/components/owner/status";
import {
  activity,
  arrears,
  claimedThisMonth,
  collectedThisMonth,
  collection,
  offlineShare,
  offlineTrend,
  previousOfflineShare,
  outstandingThisMonth,
  pendingApplications,
  pendingListings,
  properties,
  recentPayments,
  totalArrears,
  totalOccupied,
  totalReserved,
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
 *
 * The furniture is HeroUI and the charts are Nivo. Both arrive with their own
 * spacing, focus behaviour, and motion, so this file describes *what the owner
 * is being told* and almost never how a box is drawn.
 */
/**
 * A change worth a glance.
 *
 * Deliberately blunt about direction and never about *goodness*: whether a
 * rise is good depends on the number. Collection rising is good; the share of
 * payments arriving as untracked cash rising is not. So the caller says which
 * direction it wants coloured green.
 */
function Delta({
  value,
  suffix = "%",
  goodWhen = "up",
}: {
  value: number;
  suffix?: string;
  goodWhen?: "up" | "down";
}) {
  const up = value > 0;
  const good = up === (goodWhen === "up");
  const Icon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <Chip color={good ? "success" : "danger"} variant="soft" size="sm">
      <Icon className="size-3" />
      {`${Math.abs(value)}${suffix}`}
    </Chip>
  );
}

export default function DashboardPage() {
  const collectionPct = Math.round(
    (collectedThisMonth / claimedThisMonth) * 100,
  );
  const attention =
    pendingApplications.length + unacknowledged.length + arrears.length;

  // Against last month, from the same series the chart draws. Nothing here is
  // a figure someone chose to make the screen look busy.
  const previous = collection[collection.length - 2];
  const collectedChange = Math.round(
    ((collectedThisMonth - previous.received) / previous.received) * 100,
  );
  const offlineChange = offlineShare - previousOfflineShare;

  return (
    <>
      <TopBar
        title="Dashboard"
        caption="August 2026 · 3 properties · 50 rentable resources"
        action={
          <>
            <Button variant="outline" size="sm">
              <Banknote className="size-4" /> Record cash payment
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="size-4" /> Add listing
            </Button>
          </>
        }
      />

      <Page>
        {/* ------------------------------------------------------------ KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="label-caps text-muted-foreground">
                Collected in August
              </p>
              <Trend points={collection.map((c) => c.received)} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <p className="text-amount text-[30px] leading-none">
                {peso(collectedThisMonth)}
              </p>
              <Delta value={collectedChange} />
            </div>
            <p className="text-muted-foreground mt-2 text-[12.5px]">
              of {peso(claimedThisMonth)} claimed
            </p>
            <Meter
              aria-label="Share of this month's claim already collected"
              value={collectionPct}
              color="accent"
              size="sm"
              className="mt-3"
            >
              <Meter.Track>
                <Meter.Fill />
              </Meter.Track>
            </Meter>
          </Card>

          {/* The one number an owner opens this page for. */}
          <Card className="border-warning/25 bg-warning-soft p-5">
            <p className="label-caps text-pending">Still owed to you</p>
            <p className="text-amount text-pending mt-3 text-[30px] leading-none">
              {peso(outstandingThisMonth)}
            </p>
            <p className="text-muted-foreground mt-2 text-[12.5px]">
              {arrears.length} tenants · {peso(totalArrears)} past due
            </p>
            <ButtonLink
              href="/payments"
              variant="outline"
              size="sm"
              className="mt-3 w-full bg-transparent"
            >
              Who owes me
            </ButtonLink>
          </Card>

          <Card className="flex flex-row items-center gap-4 p-5">
            <OccupancyDonut
              occupied={totalOccupied}
              reserved={totalReserved}
              vacant={totalVacant}
            />
            <div className="min-w-0 flex-1">
              <p className="label-caps text-muted-foreground">Occupancy</p>
              <p className="mt-2 text-[13px] text-balance">
                <span className="text-amount text-[17px]">{totalOccupied}</span>
                <span className="text-muted-foreground">
                  {" "}
                  of {totalResources} let
                </span>
              </p>
              <p className="text-muted-foreground mt-1 text-[12.5px] text-balance">
                {totalVacant} vacant, earning nothing
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="label-caps text-muted-foreground">Cash vs online</p>
              <Trend points={[...offlineTrend, offlineShare]} tone="plain" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <p className="text-amount text-[30px] leading-none">
                {offlineShare}%
              </p>
              {/* More cash means less of the money is traceable, so a rise
                  here is the bad direction. */}
              <Delta value={offlineChange} suffix=" pts" goodWhen="down" />
            </div>
            <p className="text-muted-foreground mt-2 text-[12.5px] leading-relaxed">
              of recent payments were cash recorded by staff, not processed by
              the platform
            </p>
          </Card>
        </div>

        {/* ------------------------------------------- collection + attention */}
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div>
            <SectionHeading
              title="Claimed against received"
              caption="An invoice is a claim. The gap is what you are chasing."
            />
            <Card className="p-5">
              <div className="mb-1 flex items-center gap-4 text-[12px]">
                <span className="flex items-center gap-1.5">
                  <span className="bg-accent-soft size-2.5 rounded-full" />
                  <span className="text-muted-foreground">Claimed</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="bg-accent size-2.5 rounded-full" />
                  <span className="text-muted-foreground">Received</span>
                </span>
              </div>
              <CollectionChart data={collection} />
            </Card>

            <div className="mt-6">
              <SectionHeading
                title="Occupancy by property"
                action={
                  <ButtonLink href="/properties" variant="ghost">
                    All properties
                  </ButtonLink>
                }
              />
              <Card className="overflow-hidden p-0">
                {properties.map((p, i) => (
                  <div key={p.id}>
                    {i > 0 ? <Separator /> : null}
                    <Link
                      href="/properties"
                      className="hover:bg-secondary/50 block px-5 py-4 transition-colors"
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

                      <Meter
                        aria-label={`${p.name} occupancy`}
                        value={Math.round((p.occupied / p.resourceCount) * 100)}
                        color="success"
                        size="sm"
                        className="mt-3"
                      >
                        <Meter.Track>
                          <Meter.Fill />
                        </Meter.Track>
                      </Meter>

                      <div className="text-muted-foreground mt-2 flex gap-4 text-[12px]">
                        <span>{p.occupied} occupied</span>
                        <span>{p.reserved} reserved</span>
                        <span
                          className={
                            p.vacant > 0 ? "text-foreground font-medium" : ""
                          }
                        >
                          {p.vacant} vacant
                        </span>
                      </div>
                    </Link>
                  </div>
                ))}
              </Card>
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
                <Card className="border-bad/25 bg-bad-soft p-5">
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
                  <ButtonLink
                    href="/maintenance"
                    variant="primary"
                    className="mt-3 w-full"
                  >
                    Acknowledge <ArrowRight className="size-3.5" />
                  </ButtonLink>
                </Card>
              ) : null}

              <Card className="p-5">
                <div className="flex items-center gap-2">
                  <ClipboardList className="text-muted-foreground size-4" />
                  <p className="text-[14px] font-semibold">
                    {pendingApplications.length} applications to review
                  </p>
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
                      <Chip color="warning" variant="soft" size="sm">
                        {a.documents} docs
                      </Chip>
                    </div>
                  ))}
                </div>

                <p className="text-muted-foreground mt-3 text-[12px] leading-relaxed">
                  Two people applied for Unit 203. Approving one places the hold
                  — until then it stays on the market.
                </p>

                <ButtonLink
                  href="/applications"
                  variant="outline"
                  className="mt-3 w-full"
                >
                  Review applications
                </ButtonLink>
              </Card>

              {pendingListings.length > 0 ? (
                <Card className="border-pending/30 bg-pending-soft p-5">
                  <p className="text-[14px] font-semibold">
                    {pendingListings.length} listing awaiting platform approval
                  </p>
                  <p className="text-muted-foreground mt-1.5 text-[12.5px] leading-relaxed">
                    {pendingListings[0].title} — submitted, not yet public.
                    Nothing goes live without review.
                  </p>
                </Card>
              ) : null}

              <Card className="p-5">
                <p className="text-[14px] font-semibold">Recent activity</p>
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
              </Card>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------- recent money */}
        <div className="mt-8">
          <SectionHeading
            title="Money in"
            caption="Online payments the platform processed, and cash staff recorded — never shown as the same thing"
            action={
              <ButtonLink href="/payments" variant="ghost">
                All payments
              </ButtonLink>
            }
          />
          <Table>
            <Table.ScrollContainer>
              {/* The label belongs on the grid itself — the root is a plain
                  wrapper, so react-aria never sees one placed there. */}
              <Table.Content aria-label="Recent payments">
                <Table.Header>
                  <Table.Column isRowHeader>Tenant</Table.Column>
                  <Table.Column className="hidden md:table-cell">
                    Resource
                  </Table.Column>
                  <Table.Column className="text-right">Amount</Table.Column>
                  <Table.Column>How</Table.Column>
                  <Table.Column className="hidden lg:table-cell">
                    Money moved
                  </Table.Column>
                  <Table.Column className="hidden lg:table-cell">
                    Recorded
                  </Table.Column>
                </Table.Header>
                <Table.Body>
                  {recentPayments.map((p) => (
                    <Table.Row key={p.id}>
                      <Table.Cell>
                        <p className="text-[13.5px] font-medium">{p.tenant}</p>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          {p.reference}
                        </p>
                      </Table.Cell>
                      <Table.Cell className="text-muted-foreground hidden md:table-cell">
                        {p.resourceLabel}
                      </Table.Cell>
                      <Table.Cell className="text-amount text-right">
                        {peso(p.amountCentavos)}
                      </Table.Cell>
                      <Table.Cell>
                        <OriginPill
                          origin={p.origin}
                          method={p.method}
                          recordedBy={p.recordedBy}
                        />
                      </Table.Cell>
                      <Table.Cell className="text-muted-foreground hidden lg:table-cell">
                        {formatDateTime(p.receivedAt)}
                      </Table.Cell>
                      <Table.Cell className="hidden lg:table-cell">
                        {/* A lag between money moving and being recorded is the
                            thing worth noticing, so it is the thing coloured. */}
                        <span
                          className={
                            p.receivedAt === p.recordedAt
                              ? "text-muted-foreground"
                              : "text-money"
                          }
                        >
                          {formatDateTime(p.recordedAt)}
                        </span>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      </Page>
    </>
  );
}
