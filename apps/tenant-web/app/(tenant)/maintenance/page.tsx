import { Camera, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Page, PageHeader } from "@/components/tenant/shell";
import { MaintenanceStatus } from "@/components/tenant/status";
import { maintenance } from "@/lib/fixtures";
import { formatDate, formatDateTime } from "@/lib/money";

const STEPS = ["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"] as const;
const STEP_LABELS = ["Submitted", "Acknowledged", "In progress", "Resolved"];

/**
 * Maintenance.
 *
 * The pain being solved is a request lost in a group chat, so the tracker is
 * the screen rather than a status word in a list. **Acknowledgement is given
 * the same weight as resolution** — the journey is explicit that an
 * unacknowledged request feels ignored even when work has already started, and
 * that is a design requirement, not a nicety.
 *
 * A tenant can reopen a request they consider unresolved. They cannot delete
 * one: it is an operational record.
 */
export default function MaintenancePage() {
  return (
    <Page>
      <PageHeader
        title="Maintenance"
        caption="Report something, and watch it move without chasing anyone"
        action={
          <Button>
            <Plus className="size-4" /> Report an issue
          </Button>
        }
      />

      <div className="space-y-4">
        {maintenance.map((request) => {
          const reached = STEPS.indexOf(
            (request.state === "CLOSED" ? "RESOLVED" : request.state) as
              (typeof STEPS)[number],
          );

          return (
            <Card key={request.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{request.title}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {request.reference} · reported{" "}
                      {formatDate(request.reportedAt)}
                    </p>
                  </div>
                  <MaintenanceStatus state={request.state} />
                </div>

                <p className="text-muted-foreground mt-3 text-sm">
                  {request.description}
                </p>

                {request.photoCount > 0 ? (
                  <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                    <Camera className="size-3.5" />
                    {request.photoCount} photo
                    {request.photoCount === 1 ? "" : "s"} attached
                  </p>
                ) : null}

                <Separator className="my-4" />

                {/* Acknowledgement is a step, not a footnote. */}
                <ol className="flex items-center gap-1">
                  {STEPS.map((step, i) => {
                    const done = i <= reached;
                    return (
                      <li key={step} className="flex flex-1 items-center gap-1">
                        <div className="flex flex-col items-center gap-1.5">
                          <span
                            className={
                              done
                                ? "bg-ok text-background flex size-5 items-center justify-center rounded-full"
                                : "border-border bg-background flex size-5 items-center justify-center rounded-full border"
                            }
                          >
                            {done ? <Check className="size-3" /> : null}
                          </span>
                        </div>
                        {i < STEPS.length - 1 ? (
                          <span
                            className={
                              i < reached
                                ? "bg-ok h-px flex-1"
                                : "bg-border h-px flex-1"
                            }
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
                <div className="text-muted-foreground mt-2 flex justify-between text-[11px]">
                  {STEP_LABELS.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>

                {request.acknowledgedAt ? (
                  <p className="text-muted-foreground mt-4 text-xs">
                    Acknowledged {formatDateTime(request.acknowledgedAt)}
                    {request.assignee ? ` · assigned to ${request.assignee}` : ""}
                  </p>
                ) : (
                  <p className="text-pending mt-4 text-xs">
                    Waiting for the property to acknowledge this.
                  </p>
                )}

                {request.state === "RESOLVED" ? (
                  <Button variant="outline" size="sm" className="mt-4">
                    Still not fixed — reopen
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
