"use client";

import { useEffect } from "react";
import {
  Check,
  Clock,
  FileText,
  MapPin,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
} from "@heroui/react";

import { Page, TopBar } from "@/components/owner/shell";
import { formatDate, formatDateTime, peso } from "@/lib/money";
import { useApplicationsStore } from "@/stores/use-applications-store";
import { useSessionStore } from "@/stores/use-session-store";
import { DecisionInputDtoSchema } from "@/infrastructure/http/dto/application.dto";
import type { OwnerApplication } from "@/domain/applications/application";

export default function ApplicationsPage() {
  const activeOrganizationId = useSessionStore((state) => state.activeOrganizationId);
  const {
    applications,
    loading,
    busyId,
    rejectingApp,
    rejectReason,
    loadApplications,
    setRejectingApp,
    setRejectReason,
    decide,
  } = useApplicationsStore();

  useEffect(() => {
    if (activeOrganizationId) {
      void loadApplications(activeOrganizationId);
    }
  }, [activeOrganizationId, loadApplications]);

  const handleDecide = async (
    application: OwnerApplication,
    decision: "APPROVED" | "REJECTED",
    reason?: string,
  ) => {
    if (!activeOrganizationId) return;
    const validated = DecisionInputDtoSchema.safeParse({ decision, reason });
    if (!validated.success) {
      alert(validated.error.issues[0]?.message ?? "Invalid decision payload");
      return;
    }
    await decide(activeOrganizationId, application, validated.data);
  };

  const waiting = applications.filter(
    (a) => a.state === "SUBMITTED" || a.state === "UNDER_REVIEW",
  );

  const contested = new Map<string, number>();
  for (const a of waiting) {
    contested.set(a.listingTitle, (contested.get(a.listingTitle) ?? 0) + 1);
  }

  return (
    <>
      <TopBar
        title="Rental Applications"
        caption={
          loading
            ? "Loading applicant queue…"
            : `${waiting.length} waiting on your approval decision`
        }
      />

      <Page>
        {/* Info Banner */}
        <Card className="p-5.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-[14.5px] font-bold text-foreground">
                Approving an application automatically places a 72-hour hold
              </p>
              <p className="text-muted-foreground mt-1 max-w-3xl text-[12.5px] leading-relaxed">
                Until you approve someone, the unit remains open in the marketplace. When approved, a 72-hour hold is locked on the occupancy timeline while the applicant prepares advance and security deposit payments.
              </p>
            </div>
          </div>
        </Card>

        {applications.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border border-border/80 bg-surface">
            <Users className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-[16px] font-bold text-foreground">No applications in queue</p>
            <p className="text-muted-foreground text-[13px] mt-1">
              New customer applications will appear here as soon as they are submitted from the marketplace app.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((a) => {
              const rivals = (contested.get(a.listingTitle) ?? 0) - 1;
              const isPending =
                a.state === "SUBMITTED" || a.state === "UNDER_REVIEW";

              return (
                <Card
                  key={a.id}
                  className="p-6 rounded-2xl border border-border/80 bg-surface shadow-xs hover:border-accent/30 transition-all duration-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 text-accent font-extrabold text-[14px]">
                        {a.reference.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[16px] font-bold text-foreground truncate">
                          {a.listingTitle}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[13px] flex items-center gap-1 font-medium">
                          <MapPin className="size-3.5 text-muted-foreground/70" />
                          {a.propertyName} · {a.areaLabel}
                          {a.cityLabel ? `, ${a.cityLabel}` : ""}
                        </p>
                        <p className="text-muted-foreground mt-1 font-mono text-[11.5px]">
                          Ref: {a.reference} · Submitted {formatDateTime(a.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div>
                      {a.state === "APPROVED" ? (
                        <Chip size="sm" color="success" variant="soft" className="font-bold text-[11.5px] h-6 px-2.5">
                          Approved · Held for Move-in
                        </Chip>
                      ) : a.state === "REJECTED" ? (
                        <Chip size="sm" color="danger" variant="soft" className="font-bold text-[11.5px] h-6 px-2.5">
                          Application Turned Down
                        </Chip>
                      ) : a.state === "WITHDRAWN" ? (
                        <Chip size="sm" color="default" variant="soft" className="font-bold text-[11.5px] h-6 px-2.5">
                          Withdrawn by Applicant
                        </Chip>
                      ) : (
                        <Chip size="sm" color="warning" variant="soft" className="font-bold text-[11.5px] h-6 px-2.5">
                          Awaiting Your Decision
                        </Chip>
                      )}
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="mt-5 grid gap-4 sm:grid-cols-4 bg-surface-secondary/40 p-4 rounded-2xl border border-border/60">
                    <div>
                      <span className="label-caps text-muted-foreground font-bold block">
                        Desired Move-in
                      </span>
                      <p className="mt-1 text-[13.5px] font-bold text-foreground">
                        {formatDate(a.desiredMoveIn)} ({a.desiredTermMonths} mo)
                      </p>
                    </div>

                    <div>
                      <span className="label-caps text-muted-foreground font-bold block">
                        Monthly Rent
                      </span>
                      <p className="mt-1 text-[14px] font-extrabold text-foreground">
                        {peso(a.monthlyRentCentavos)}/mo
                      </p>
                    </div>

                    <div>
                      <span className="label-caps text-muted-foreground font-bold block">
                        Vetting Documents
                      </span>
                      <p className="mt-1 flex items-center gap-1.5 text-[13.5px] font-semibold text-foreground">
                        <FileText className="text-accent size-4" />
                        {a.documentCount} document{a.documentCount === 1 ? "" : "s"} attached
                      </p>
                    </div>

                    <div>
                      <span className="label-caps text-muted-foreground font-bold block">
                        Competition
                      </span>
                      <p className="mt-1 text-[13px] font-semibold">
                        {rivals > 0 ? (
                          <span className="text-amber-600 font-bold">
                            {rivals} other applicant{rivals === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Only applicant</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {a.message ? (
                    <div className="mt-3.5 px-3.5 py-2.5 rounded-xl bg-surface-secondary/20 border border-border/40 text-[12.5px] text-muted-foreground">
                      <span className="font-bold text-foreground mr-1.5">Applicant Note:</span>
                      {a.message}
                    </div>
                  ) : null}

                  {a.decisionReason ? (
                    <div className="mt-3 text-[12.5px] text-rose-600 font-medium">
                      Reason for refusal: {a.decisionReason}
                    </div>
                  ) : null}

                  {a.holdExpiresAt ? (
                    <div className="mt-3 text-[12.5px] text-emerald-600 font-bold flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      Held until {formatDateTime(a.holdExpiresAt)}
                    </div>
                  ) : null}

                  {/* Actions */}
                  {isPending ? (
                    <div className="mt-5 flex flex-wrap items-center gap-3 pt-4 border-t border-border/80">
                      <Button
                        size="sm"
                        variant="primary"
                        className="rounded-xl font-bold h-9 shadow-md shadow-accent/20 px-5 text-[13px]"
                        isDisabled={busyId === a.id}
                        onClick={() => void handleDecide(a, "APPROVED")}
                      >
                        <Check className="size-4" />
                        <span>Approve & Place 72h Hold</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl font-bold h-9 text-rose-600 hover:border-rose-500/40 text-[13px]"
                        isDisabled={busyId === a.id}
                        onClick={() => setRejectingApp(a)}
                      >
                        <X className="size-4" />
                        <span>Reject Application</span>
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </Page>

      {/* Reject Reason Modal */}
      {rejectingApp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <h3 className="text-[17px] font-bold text-foreground">
              Turn Down Application
            </h3>
            <p className="text-muted-foreground text-[13px] leading-relaxed">
              Please provide a brief reason for the applicant. This explanation will be visible on their customer app.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Unit has been allocated to a concurrent applicant, or move-in date is too far out..."
              className="w-full p-3 rounded-xl bg-surface-secondary/70 border border-border text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl font-bold"
                onClick={() => setRejectingApp(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white"
                isDisabled={rejectReason.trim().length < 3}
                onClick={() => void handleDecide(rejectingApp, "REJECTED", rejectReason)}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
