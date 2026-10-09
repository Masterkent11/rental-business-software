"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Building2, Check, MapPin, View, X } from "lucide-react";

import { Page, SectionHeading, TopBar } from "@/components/owner/shell";
import { Badge, Btn, Card, ConfirmDialog, EmptyState, ErrorState, InlineError, LinkBtn, SkeletonRows } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
import { formatDate } from "@/lib/money";
import { PERMISSION_LABEL, type Representation } from "@/domain/agents/agent";
import type { AgentPermissions } from "@/domain/listings/listing";
import { useAgentStore } from "@/stores/use-agent-store";

function PermissionList({ permissions }: { permissions: AgentPermissions }) {
  const granted = (Object.keys(PERMISSION_LABEL) as (keyof AgentPermissions)[]).filter((key) => permissions[key]);
  if (granted.length === 0) return <span className="text-[12px] text-muted">View and respond to inquiries</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {granted.map((key) => (
        <Badge key={key}>{PERMISSION_LABEL[key].label}</Badge>
      ))}
    </span>
  );
}

function RepresentationCard({ representation }: { representation: Representation }) {
  const { busyId, respond, askEnd } = useAgentStore();
  const busy = busyId === representation.id;
  const active = representation.state === "ACTIVE";
  const body = (
    <>
      <div className="relative aspect-[16/9] bg-surface-secondary">
        {representation.listingPhoto ? <Photo src={representation.listingPhoto} alt="" className="size-full" sizes="(max-width: 768px) 100vw, 33vw" /> : null}
        <span className="absolute left-3 top-3 flex gap-1.5">
          <Badge tone="dark">{representation.listingIntent === "SALE" ? "For sale" : "For rent"}</Badge>
          {representation.state === "PENDING" ? <Badge tone="pending">Invitation</Badge> : null}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <p className="truncate text-[14.5px] font-semibold">{representation.listingTitle}</p>
        <p className="flex items-center gap-1 text-[12.5px] text-muted">
          <MapPin className="size-3.5" aria-hidden />
          {representation.areaLabel}, {representation.cityLabel}
        </p>
        <p className="text-[12.5px] text-muted">Owner: {representation.organizationName}</p>
        <PermissionList permissions={representation.permissions} />
      </div>
    </>
  );
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      {active ? (
        <Link href={`/agent/properties/${representation.listingId}`} className="focusable block">
          {body}
        </Link>
      ) : (
        body
      )}
      <div className="mt-auto flex flex-wrap gap-2 border-t border-border p-3">
        {representation.state === "PENDING" ? (
          <>
            <Btn size="sm" busy={busy} onClick={() => void respond(representation.id, true)}>
              <Check className="size-3.5" aria-hidden /> Accept
            </Btn>
            <Btn size="sm" variant="outline" busy={busy} onClick={() => void respond(representation.id, false)}>
              <X className="size-3.5" aria-hidden /> Decline
            </Btn>
          </>
        ) : (
          <>
            <LinkBtn href={`/agent/properties/${representation.listingId}`} size="sm">
              Open
            </LinkBtn>
            {representation.permissions.canManageTour ? (
              <LinkBtn href={`/agent/tours/${representation.listingId}`} size="sm" variant="outline">
                <View className="size-3.5" aria-hidden /> Tour
              </LinkBtn>
            ) : null}
            <Btn size="sm" variant="ghost" onClick={() => askEnd(representation.id)}>
              Stop representing
            </Btn>
          </>
        )}
      </div>
    </li>
  );
}

export default function AgentPropertiesPage() {
  const { representations, representationsLoaded, representationsError, actionError, confirmEndId, busyId, loadRepresentations, endRepresentation, askEnd } = useAgentStore();

  useEffect(() => {
    void loadRepresentations();
  }, [loadRepresentations]);

  const pending = representations.filter((r) => r.state === "PENDING");
  const active = representations.filter((r) => r.state === "ACTIVE");
  const ended = representations.filter((r) => r.state === "ENDED");
  const ending = representations.find((r) => r.id === confirmEndId) ?? null;

  return (
    <Page>
      <TopBar title="Represented properties" caption="Owners invite you to represent their listings. Ownership stays with them." />
      <InlineError message={confirmEndId ? null : actionError} />
      {!representationsLoaded ? (
        <Card>
          <SkeletonRows rows={3} />
        </Card>
      ) : representationsError ? (
        <Card>
          <ErrorState message={representationsError} onRetry={() => void loadRepresentations()} />
        </Card>
      ) : representations.length === 0 ? (
        <Card>
          <EmptyState icon={<Building2 className="size-5" aria-hidden />} title="No properties yet" body="When an owner invites you to represent a listing, the invitation appears here." />
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {pending.length > 0 ? (
            <section>
              <SectionHeading title="Invitations" caption="Accept to start handling inquiries and viewings for these listings." />
              <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pending.map((r) => (
                  <RepresentationCard key={r.id} representation={r} />
                ))}
              </ul>
            </section>
          ) : null}
          <section>
            <SectionHeading title="Active" />
            {active.length === 0 ? (
              <p className="text-[13px] text-muted">No active representations.</p>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {active.map((r) => (
                  <RepresentationCard key={r.id} representation={r} />
                ))}
              </ul>
            )}
          </section>
          {ended.length > 0 ? (
            <section>
              <SectionHeading title="Ended" />
              <Card>
                <ul className="divide-y divide-border">
                  {ended.map((r) => (
                    <li key={r.id} className="flex items-center justify-between px-5 py-3 text-[13px]">
                      <span className="truncate">{r.listingTitle}</span>
                      <span className="text-muted">{r.endedAt ? `Ended ${formatDate(r.endedAt)}` : "Declined"}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}
        </div>
      )}
      <ConfirmDialog
        open={ending !== null}
        title="Stop representing this property?"
        body={ending ? `You will lose access to ${ending.listingTitle}, its tour and its new inquiries. ${ending.organizationName} keeps the listing.` : ""}
        confirmLabel="Stop representing"
        tone="danger"
        busy={ending !== null && busyId === ending.id}
        error={actionError}
        onConfirm={() => ending && void endRepresentation(ending.id)}
        onCancel={() => askEnd(null)}
      />
    </Page>
  );
}
