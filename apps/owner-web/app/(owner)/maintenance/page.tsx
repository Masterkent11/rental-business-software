import { Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page, Panel, SectionHeading, TopBar } from "@/components/owner/shell";
import { MaintenanceStatus, Pill } from "@/components/owner/status";
import { maintenance, unacknowledged } from "@/lib/fixtures";
import { formatDateTime } from "@/lib/money";

/**
 * Maintenance.
 *
 * Sorted by what is unacknowledged, not by what is urgent.
 *
 * The tenant journey is explicit that **acknowledgement matters as much as
 * resolution** — an unacknowledged request feels ignored even when work has
 * already started. So the owner's view leads with the requests nobody has
 * confirmed seeing, because that is the failure the product exists to fix.
 */
export default function MaintenancePage() {
  const priority = { URGENT: "bad", NORMAL: "pending", LOW: "neutral" } as const;

  return (
    <>
      <TopBar
        title="Maintenance"
        caption={`${maintenance.length} requests · ${unacknowledged.length} not yet acknowledged`}
      />

      <Page>
        {unacknowledged.length > 0 ? (
          <Panel tone="bad" className="mb-6 p-5">
            <p className="text-[14px] font-semibold">
              {unacknowledged.length} request
              {unacknowledged.length === 1 ? "" : "s"} nobody has acknowledged
            </p>
            <p className="text-muted-foreground mt-1.5 max-w-3xl text-[13px] leading-relaxed">
              Acknowledging is not the same as fixing, and it is the part
              tenants notice. A request sitting unacknowledged is the exact
              experience — an issue lost in a group chat — that this replaces.
            </p>
          </Panel>
        ) : null}

        <SectionHeading title="All requests" />
        <div className="space-y-3">
          {maintenance.map((m) => (
            <Panel key={m.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold">{m.title}</p>
                    <Pill variant={priority[m.priority]}>
                      {m.priority.toLowerCase()}
                    </Pill>
                  </div>
                  <p className="text-muted-foreground mt-1 text-[13px]">
                    {m.resourceLabel} · {m.propertyName} · reported by{" "}
                    {m.reportedBy}
                  </p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-[11.5px]">
                    {m.reference} · {formatDateTime(m.reportedAt)}
                  </p>
                </div>
                <MaintenanceStatus state={m.state} />
              </div>

              <div className="border-border mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                {m.state === "REPORTED" ? (
                  <Button size="sm" className="rounded-full">
                    <Check className="size-3.5" /> Acknowledge
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" className="rounded-full">
                  <UserPlus className="size-3.5" />
                  {m.assignee ? `Assigned to ${m.assignee}` : "Assign"}
                </Button>
                {m.state === "IN_PROGRESS" ? (
                  <Button size="sm" variant="ghost" className="rounded-full">
                    Mark resolved
                  </Button>
                ) : null}
              </div>
            </Panel>
          ))}
        </div>
      </Page>
    </>
  );
}
