"use client";

import { useEffect } from "react";
import { Check, Clock, FileText, MapPin, ShieldCheck, Users, X } from "lucide-react";

import { Page, TopBar } from "@/components/owner/shell";
import { Badge, Btn, Card, EmptyState, ErrorState, InlineError, SkeletonRows, TextArea } from "@/components/owner/ui";
import { formatDate, formatDateTime, peso } from "@/lib/money";
import { useApplicationsStore } from "@/stores/use-applications-store";
import { useSessionStore } from "@/stores/use-session-store";
import type { OwnerApplication } from "@/domain/applications/application";

const stateBadge = (application: OwnerApplication) => {
  if (application.tenancy?.kind === "LEASE" && application.tenancy.state === "COMMITTED") {
    return <Badge tone="ok">Tenancy confirmed</Badge>;
  }
  switch (application.state) {
    case "APPROVED":
      return <Badge tone="ok">Approved · held for move-in</Badge>;
    case "REJECTED":
      return <Badge tone="bad">Declined</Badge>;
    case "WITHDRAWN":
      return <Badge>Withdrawn</Badge>;
    case "EXPIRED":
      return <Badge>Expired</Badge>;
    default:
      return <Badge tone="pending">Awaiting your decision</Badge>;
  }
};

export default function ApplicationsPage() {
  const organizationId = useSessionStore((s) => s.activeOrganizationId);
  const { applications: loadedApplications, organizationId: loadedOrganizationId, loading, error, busyId, rejectingApp, rejectReason, loadApplications, setRejectingApp, setRejectReason, decide, confirmTenancy, confirmingId, requirementsReviewed, setConfirmingId, setRequirementsReviewed } =
    useApplicationsStore();
  const applications = loadedOrganizationId === organizationId ? loadedApplications : [];

  useEffect(() => {
    if (organizationId) void loadApplications(organizationId);
  }, [organizationId, loadApplications]);

  const waiting = applications.filter((a) => a.state === "SUBMITTED" || a.state === "UNDER_REVIEW");
  const contested = new Map<string, number>();
  for (const a of waiting) contested.set(a.listingTitle, (contested.get(a.listingTitle) ?? 0) + 1);

  return (
    <Page>
      <TopBar title="Applications" caption={loading ? "Loading…" : `${waiting.length} waiting for your decision`} />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning-soft/60 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
        <p className="text-[13px] leading-relaxed text-foreground">
          Approving an application places a 72-hour hold on the unit while the applicant arranges advance and deposit. Until then, the unit stays open on the marketplace.
        </p>
      </div>

      {error && applications.length > 0 ? <div className="mb-4"><InlineError message={error} /></div> : null}

      {loading && applications.length === 0 ? (
        <Card><SkeletonRows rows={3} /></Card>
      ) : error && applications.length === 0 ? (
        <Card><ErrorState message={error} onRetry={() => organizationId && void loadApplications(organizationId)} /></Card>
      ) : applications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="size-5" aria-hidden />}
            title="No applications yet"
            body="When a customer applies for one of your monthly listings, the application appears here."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {applications.map((a) => {
            const rivals = (contested.get(a.listingTitle) ?? 0) - 1;
            const pending = a.state === "SUBMITTED" || a.state === "UNDER_REVIEW";
            return (
              <Card key={a.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{a.listingTitle}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-muted">
                      <MapPin className="size-3.5" aria-hidden />
                      {a.propertyName} · {a.areaLabel}
                      {a.cityLabel ? `, ${a.cityLabel}` : ""}
                    </p>
                    <p className="mt-0.5 font-mono text-[11.5px] text-muted">#{a.reference} · {formatDateTime(a.createdAt)}</p>
                  </div>
                  {stateBadge(a)}
                </div>
                <dl className="mt-4 grid gap-3 rounded-xl bg-surface-secondary/60 p-4 text-[13px] sm:grid-cols-4">
                  <div><dt className="text-muted">Move-in</dt><dd className="font-semibold">{formatDate(a.desiredMoveIn)} · {a.desiredTermMonths} mo</dd></div>
                  <div><dt className="text-muted">Rent</dt><dd className="tabular font-semibold">{peso(a.monthlyRentCentavos)}/mo</dd></div>
                  <div><dt className="text-muted">Documents</dt><dd className="flex items-center gap-1 font-semibold"><FileText className="size-3.5" aria-hidden />{a.documentCount}</dd></div>
                  <div><dt className="text-muted">Competition</dt><dd className="font-semibold">{rivals > 0 ? `${rivals} other applicant${rivals === 1 ? "" : "s"}` : "Only applicant"}</dd></div>
                </dl>
                {a.message ? <p className="mt-3 text-[13px] text-muted"><span className="font-semibold text-foreground">Note: </span>{a.message}</p> : null}
                {a.decisionReason ? <p className="mt-2 text-[12.5px] text-danger">Reason: {a.decisionReason}</p> : null}
                {a.holdExpiresAt ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-success"><Clock className="size-3.5" aria-hidden />Held until {formatDateTime(a.holdExpiresAt)}</p>
                ) : null}
                {pending ? (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <Btn size="sm" busy={busyId === a.id} onClick={() => organizationId && void decide(organizationId, a, { decision: "APPROVED" })}>
                      <Check className="size-4" aria-hidden /> Approve & hold 72h
                    </Btn>
                    <Btn size="sm" variant="outline" disabled={busyId === a.id} onClick={() => setRejectingApp(a)}>
                      <X className="size-4" aria-hidden /> Decline
                    </Btn>
                  </div>
                ) : null}
                {a.state === "APPROVED" && !(a.tenancy?.kind === "LEASE" && a.tenancy.state === "COMMITTED") ? (
                  <div className="mt-4 border-t border-border pt-4">
                    {confirmingId === a.id ? (
                      <div className="flex flex-col items-start gap-3">
                        <label className="flex items-start gap-2 text-[13px]">
                          <input type="checkbox" checked={requirementsReviewed} disabled={busyId === a.id} onChange={(event) => setRequirementsReviewed(event.target.checked)} />
                          I have reviewed the required payments, documents, and move-in conditions with this applicant.
                        </label>
                        <p className="text-[12.5px] text-muted">This confirms the lease. My Home opens for the tenant on the lease start date.</p>
                        <div className="flex gap-2">
                          <Btn size="sm" disabled={!requirementsReviewed} busy={busyId === a.id} onClick={async () => {
                            if (organizationId && await confirmTenancy(organizationId, a.id, requirementsReviewed)) {
                              setConfirmingId(null);
                              setRequirementsReviewed(false);
                            }
                          }}>Confirm tenancy</Btn>
                          <Btn size="sm" variant="ghost" disabled={busyId === a.id} onClick={() => setConfirmingId(null)}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <Btn size="sm" onClick={() => { setConfirmingId(a.id); setRequirementsReviewed(false); }}>Review and confirm tenancy</Btn>
                    )}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {rejectingApp ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center" onClick={() => setRejectingApp(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="decline-title" className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 id="decline-title" className="text-[16px] font-semibold">Decline this application?</h2>
            <p className="mt-1.5 text-[13px] text-muted">The applicant sees this reason in the app.</p>
            <TextArea
              id="decline-reason"
              className="mt-4"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. The unit was let to an earlier applicant."
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setRejectingApp(null)}>Cancel</Btn>
              <Btn
                variant="danger"
                busy={busyId === rejectingApp.id}
                disabled={rejectReason.trim().length < 3}
                onClick={() => organizationId && void decide(organizationId, rejectingApp, { decision: "REJECTED", reason: rejectReason.trim() })}
              >
                Decline application
              </Btn>
            </div>
          </div>
        </div>
      ) : null}
    </Page>
  );
}
