"use client";

import { useEffect } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Plus,
} from "lucide-react";
import {
  Card,
  Chip,
} from "@heroui/react";

import {
  ButtonLink,
  Page,
  SectionHeading,
  TopBar,
} from "@/components/owner/shell";
import { CollectionChart } from "@/components/owner/nivo";
import { OriginPill } from "@/components/owner/status";
import { formatDateTime, peso } from "@/lib/money";
import { useSessionStore } from "@/stores/use-session-store";
import { useDashboardStore } from "@/stores/use-dashboard-store";
import type { Collection } from "@/domain/payments/collection";

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
    <Chip
      color={good ? "success" : "danger"}
      variant="soft"
      size="sm"
      className="font-bold text-[11px] h-5 px-1.5 flex items-center gap-0.5"
    >
      <Icon className="size-3" />
      {`${Math.abs(value)}${suffix}`}
    </Chip>
  );
}

export default function DashboardPage() {
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
        <TopBar title="Executive Dashboard" />
        <Page>
          <div className="p-8 text-center">
            {error ? (
              <p className="text-red-500 text-[14px] font-medium">{error}</p>
            ) : (
              <>
                <div className="inline-block size-6 animate-spin rounded-full border-2 border-accent border-t-transparent mb-3" />
                <p className="text-muted-foreground text-[14px] font-medium">
                  Loading financial and operations state…
                </p>
              </>
            )}
          </div>
        </Page>
      </>
    );
  }

  return <Dashboard collection={collection} />;
}

function Dashboard({ collection }: { collection: Collection }) {
  const collectionPct =
    collection.claimedCentavos > 0
      ? Math.round(
          (collection.receivedCentavos / collection.claimedCentavos) * 100,
        )
      : 0;

  const totalArrears = collection.arrears.reduce(
    (n, a) => n + a.owedCentavos,
    0,
  );

  const previous = collection.history[collection.history.length - 2];
  const collectedChange =
    previous && previous.receivedCentavos > 0
      ? Math.round(
          ((collection.receivedCentavos - previous.receivedCentavos) /
            previous.receivedCentavos) *
            100,
        )
      : 0;

  return (
    <>
      <TopBar title="Executive Dashboard">
        <ButtonLink href="/listings" variant="primary" size="sm">
          <Plus className="size-3.5" />
          Create Listing
        </ButtonLink>
      </TopBar>

      <Page>
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/80 bg-surface/70 backdrop-blur-xl p-5 shadow-xs transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[12.5px] font-medium">
                Collected this month
              </span>
              <Delta value={collectedChange} />
            </div>
            <div className="mt-3">
              <p className="text-[26px] font-extrabold tracking-tight text-foreground font-mono">
                {peso(collection.receivedCentavos)}
              </p>
              <p className="text-muted-foreground text-[12px] mt-1 font-medium">
                Target: {peso(collection.claimedCentavos)}
              </p>
            </div>
          </Card>

          <Card className="border-border/80 bg-surface/70 backdrop-blur-xl p-5 shadow-xs transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[12.5px] font-medium">
                Collection rate
              </span>
              <Chip
                color={collectionPct >= 90 ? "success" : "warning"}
                variant="soft"
                size="sm"
                className="font-bold text-[11px]"
              >
                {collectionPct}%
              </Chip>
            </div>
            <div className="mt-3">
              <p className="text-[26px] font-extrabold tracking-tight text-foreground">
                {collectionPct}%
              </p>
              <p className="text-muted-foreground text-[12px] mt-1 font-medium">
                Outstanding: {peso(collection.outstandingCentavos)}
              </p>
            </div>
          </Card>

          <Card className="border-border/80 bg-surface/70 backdrop-blur-xl p-5 shadow-xs transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[12.5px] font-medium">
                Offline cash share
              </span>
              <Chip color="default" variant="soft" size="sm" className="font-semibold text-[11px]">
                Audited
              </Chip>
            </div>
            <div className="mt-3">
              <p className="text-[26px] font-extrabold tracking-tight text-foreground">
                {collection.offlineSharePercent}%
              </p>
              <p className="text-muted-foreground text-[12px] mt-1 font-medium">
                Attested by property staff
              </p>
            </div>
          </Card>

          <Card className="border-border/80 bg-surface/70 backdrop-blur-xl p-5 shadow-xs transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[12.5px] font-medium">
                Total active arrears
              </span>
              <Chip
                color={totalArrears > 0 ? "danger" : "success"}
                variant="soft"
                size="sm"
                className="font-bold text-[11px]"
              >
                {collection.arrears.length} Overdue
              </Chip>
            </div>
            <div className="mt-3">
              <p className="text-[26px] font-extrabold tracking-tight text-red-500 font-mono">
                {peso(totalArrears)}
              </p>
              <p className="text-muted-foreground text-[12px] mt-1 font-medium">
                Needs follow-up
              </p>
            </div>
          </Card>
        </div>

        {/* Collection Trend Chart */}
        <div className="mt-8">
          <SectionHeading
            title="Revenue Performance & Historical Collections"
            caption="Comparison of claimed rent vs actual received payments over the last 6 months"
          />
          <Card className="border-border/80 bg-surface/70 backdrop-blur-xl p-5 shadow-xs">
            <div className="h-[320px] w-full">
              <CollectionChart
                data={collection.history.map((h) => ({
                  month: h.month,
                  claimed: h.claimedCentavos,
                  received: h.receivedCentavos,
                }))}
              />
            </div>
          </Card>
        </div>

        {/* Arrears & Recent Payments */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Active Arrears List */}
          <div>
            <SectionHeading
              title="Tenants with Overdue Balances"
              caption="Track active unpaid lease invoices"
            />
            <Card className="border-border/80 bg-surface/70 backdrop-blur-xl p-4 shadow-xs">
              {collection.arrears.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-[13px]">
                  <CheckCircle2 className="size-6 text-emerald-500 mx-auto mb-2" />
                  All accounts are fully settled. No active arrears.
                </div>
              ) : (
                <div className="space-y-3">
                  {collection.arrears.map((item) => (
                    <div
                      key={item.occupancyId}
                      className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-semibold text-[13.5px] text-foreground">
                          {item.tenantName}
                        </p>
                        <p className="text-muted-foreground text-[12px]">
                          {item.resourceLabel} · {item.daysOverdue} days overdue
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-red-500 text-[14px]">
                          {peso(item.owedCentavos)}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {item.invoiceCount} invoices
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Recent Payments List */}
          <div>
            <SectionHeading
              title="Recent Verified Payments"
              caption="Real-time stream of online and recorded offline payments"
            />
            <Card className="border-border/80 bg-surface/70 backdrop-blur-xl p-4 shadow-xs">
              {collection.recentPayments.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-[13px]">
                  No recent payment activity recorded this month.
                </div>
              ) : (
                <div className="space-y-3">
                  {collection.recentPayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-semibold text-[13.5px] text-foreground">
                          {p.tenantName}
                        </p>
                        <p className="text-muted-foreground text-[12px]">
                          {p.resourceLabel} · {formatDateTime(p.recordedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-foreground text-[14px]">
                          {peso(p.amountCentavos)}
                        </p>
                        <OriginPill origin={p.origin} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </Page>
    </>
  );
}
