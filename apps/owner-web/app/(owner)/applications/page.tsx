import { Check, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page, Panel, TopBar } from "@/components/owner/shell";
import { Pill } from "@/components/owner/status";
import { applications, pendingApplications } from "@/lib/fixtures";
import { formatDate, formatDateTime } from "@/lib/money";

/**
 * Applications.
 *
 * Two rules from the product shape this screen, and both are stated on it
 * rather than assumed:
 *
 *   * **Applying reserves nothing.** Several people may apply for one unit.
 *     Approving one is what places the hold and takes it off the market — so
 *     competing applications are grouped, not hidden.
 *   * **The platform does not screen anyone.** It carries the documents; the
 *     owner judges them. No score, no credit check, permanently.
 */
export default function ApplicationsPage() {
  const contested = new Map<string, number>();
  for (const a of pendingApplications) {
    contested.set(a.resourceLabel, (contested.get(a.resourceLabel) ?? 0) + 1);
  }

  return (
    <>
      <TopBar
        title="Applications"
        caption={`${pendingApplications.length} waiting on your decision`}
      />

      <Page>
        <Panel tone="pending" className="mb-5 p-5">
          <p className="text-[14px] font-semibold">
            Approving an application places the hold
          </p>
          <p className="text-muted-foreground mt-1.5 max-w-3xl text-[13px] leading-relaxed">
            Until you approve someone, the resource stays on the market and
            anyone else can apply. Once you approve, it is held for 72 hours
            while they pay the advance and deposit — and if the term you approve
            overlaps an existing booking or lease, the approval is refused with
            the conflict shown.
          </p>
        </Panel>

        <div className="space-y-4">
          {applications.map((a) => {
            const rivals = (contested.get(a.resourceLabel) ?? 0) - 1;
            const pending = a.state === "SUBMITTED";

            return (
              <Panel key={a.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <span className="bg-secondary text-foreground grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold">
                      {a.applicant
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold">{a.applicant}</p>
                      <p className="text-muted-foreground mt-0.5 text-[13px]">
                        {a.resourceLabel} · {a.propertyName}
                      </p>
                      <p className="text-muted-foreground mt-0.5 font-mono text-[11.5px]">
                        {a.reference} · submitted {formatDateTime(a.submittedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {a.state === "APPROVED" ? (
                      <Pill variant="ok">Approved · held</Pill>
                    ) : a.state === "REJECTED" ? (
                      <Pill variant="bad">Rejected</Pill>
                    ) : (
                      <Pill variant="pending">Awaiting your decision</Pill>
                    )}
                  </div>
                </div>

                <dl className="mt-4 grid gap-4 sm:grid-cols-4">
                  <div>
                    <dt className="label-caps text-muted-foreground">Move-in</dt>
                    <dd className="mt-1 text-[13.5px]">{formatDate(a.moveIn)}</dd>
                  </div>
                  <div>
                    <dt className="label-caps text-muted-foreground">
                      Occupants
                    </dt>
                    <dd className="mt-1 text-[13.5px]">{a.occupants}</dd>
                  </div>
                  <div>
                    <dt className="label-caps text-muted-foreground">
                      Documents
                    </dt>
                    <dd className="mt-1 flex items-center gap-1.5 text-[13.5px]">
                      <FileText className="text-muted-foreground size-3.5" />
                      {a.documents} attached
                    </dd>
                  </div>
                  <div>
                    <dt className="label-caps text-muted-foreground">
                      Competing
                    </dt>
                    <dd className="mt-1 text-[13.5px]">
                      {rivals > 0 ? (
                        <span className="text-money font-medium">
                          {rivals} other applicant{rivals === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </dd>
                  </div>
                </dl>

                {pending ? (
                  <div className="border-border mt-4 flex flex-wrap gap-2 border-t pt-4">
                    <Button size="sm" className="rounded-full">
                      <Check className="size-3.5" /> Approve and hold
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full">
                      <FileText className="size-3.5" /> View documents
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-bad hover:text-bad rounded-full"
                    >
                      <X className="size-3.5" /> Reject with a reason
                    </Button>
                  </div>
                ) : null}
              </Panel>
            );
          })}
        </div>
      </Page>
    </>
  );
}
