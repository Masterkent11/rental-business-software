"use client";

import { CalendarClock, MessageSquare } from "lucide-react";

import { Page, TopBar } from "@/components/owner/shell";
import { Badge, Btn, Card, EmptyState, ErrorState, Field, InlineError, LinkBtn, SegmentedTabs, SkeletonRows, TextInput } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
import { cn } from "@/lib/utils";
import {
  ACTION_LABEL,
  VIEWING_STATUS_LABEL,
  actionsFor,
  dayKey,
  formatDay,
  formatTime,
  groupByDay,
  type Viewing,
  type ViewingStatus,
} from "@/domain/viewings/viewing";
import { useEngagementStore } from "@/stores/use-engagement-store";
import { useSessionStore } from "@/stores/use-session-store";

const tone = (status: ViewingStatus) =>
  status === "CONFIRMED" ? "ok" : status === "REQUESTED" ? "dark" : status === "RESCHEDULE_REQUESTED" ? "pending" : status === "CANCELLED" ? "bad" : "neutral";

function ViewingRow({ viewing, messagesPath, agent }: { viewing: Viewing; messagesPath: string; agent: boolean }) {
  const { selectedViewingId, busyId, actionError, viewingNote, now, selectViewing, setViewingNote, act } = useEngagementStore();
  const open = selectedViewingId === viewing.id;
  const actions = actionsFor(viewing, new Date(now));
  const busy = busyId === viewing.id;

  return (
    <li className={cn("px-5 py-4", open && "bg-surface-secondary/50")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="tabular w-20 shrink-0 text-[15px] font-semibold">{formatTime(viewing.scheduledAt)}</div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
            {viewing.listingPhoto ? <Photo src={viewing.listingPhoto} alt="" className="size-full" sizes="44px" /> : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold">{viewing.customerName}</p>
            <p className="truncate text-[12.5px] text-muted">
              {viewing.listingTitle} · {viewing.areaLabel}
              {!agent && viewing.agentName ? ` · ${viewing.agentName}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={tone(viewing.status)}>{VIEWING_STATUS_LABEL[viewing.status]}</Badge>
          <Btn size="sm" variant="ghost" onClick={() => selectViewing(open ? null : viewing.id)} aria-expanded={open}>
            {open ? "Close" : "Manage"}
          </Btn>
        </div>
      </div>
      {open ? (
        <div className="mt-4 flex flex-col gap-3 sm:pl-20">
          {viewing.customerNote ? (
            <p className="text-[13px]">
              <span className="text-muted">Note from {viewing.customerName}: </span>
              {viewing.customerNote}
            </p>
          ) : null}
          {viewing.partnerNote ? (
            <p className="text-[13px]">
              <span className="text-muted">Your last note: </span>
              {viewing.partnerNote}
            </p>
          ) : null}
          {viewing.status === "CANCELLED" && viewing.cancelledByRole ? (
            <p className="text-[12.5px] text-muted">Cancelled by the {viewing.cancelledByRole === "CUSTOMER" ? "customer" : viewing.cancelledByRole.toLowerCase()}.</p>
          ) : null}
          {actions.length > 0 ? (
            <Field label="Note to the customer (optional)" htmlFor={`note-${viewing.id}`}>
              <TextInput id={`note-${viewing.id}`} value={viewingNote} onChange={(e) => setViewingNote(e.target.value)} placeholder="Please bring a valid ID" maxLength={500} />
            </Field>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Btn
                key={action}
                size="sm"
                variant={action === "CANCEL" ? "danger" : action === "CONFIRM" || action === "COMPLETE" ? "primary" : "outline"}
                busy={busy}
                onClick={() => void act(viewing, action)}
              >
                {ACTION_LABEL[action]}
              </Btn>
            ))}
            <LinkBtn href={`${messagesPath}?c=${viewing.conversationId}`} size="sm" variant="outline">
              <MessageSquare className="size-3.5" aria-hidden /> Message
            </LinkBtn>
          </div>
          <InlineError message={actionError} />
        </div>
      ) : null}
    </li>
  );
}

export function ViewingSchedule() {
  const scope = useSessionStore((s) => s.scope);
  const { viewings, viewingsLoaded, viewingsError, viewingFilter, now, setViewingFilter, loadViewings } = useEngagementStore();
  if (!scope) return null;
  const agent = scope.kind === "AGENT";
  const messagesPath = agent ? "/agent/messages" : "/messages";
  const today = dayKey(new Date(now).toISOString());
  const filtered = viewings.filter((v) => {
    const upcoming = new Date(v.scheduledAt).getTime() >= now - 2 * 60 * 60 * 1000 && v.status !== "COMPLETED" && v.status !== "CANCELLED";
    return viewingFilter === "upcoming" ? upcoming : !upcoming;
  });
  const days = viewingFilter === "upcoming" ? groupByDay(filtered) : groupByDay(filtered).reverse();
  const pending = viewings.filter((v) => v.status === "REQUESTED").length;

  return (
    <Page>
      <TopBar title="Viewings" caption={pending > 0 ? `${pending} request${pending === 1 ? "" : "s"} waiting for your confirmation.` : "Property visits requested from the customer app."}>
        <SegmentedTabs<"upcoming" | "past">
          label="Show"
          value={viewingFilter}
          onChange={setViewingFilter}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past & cancelled" },
          ]}
        />
      </TopBar>
      {!viewingsLoaded ? (
        <Card>
          <SkeletonRows rows={4} />
        </Card>
      ) : viewingsError && viewings.length === 0 ? (
        <Card>
          <ErrorState message={viewingsError} onRetry={() => void loadViewings()} />
        </Card>
      ) : days.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarClock className="size-5" aria-hidden />}
            title={viewingFilter === "upcoming" ? "No upcoming viewings" : "Nothing here yet"}
            body={viewingFilter === "upcoming" ? "Customers book a viewing slot from the listing. New requests show up here instantly." : "Completed and cancelled viewings from the last 30 days appear here."}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {days.map(({ day, items }) => (
            <section key={day} aria-label={formatDay(day)}>
              <h2 className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold">
                {formatDay(day)}
                {day === today ? <Badge tone="dark">Today</Badge> : null}
              </h2>
              <Card>
                <ul className="divide-y divide-border">
                  {items.map((viewing) => (
                    <ViewingRow key={viewing.id} viewing={viewing} messagesPath={messagesPath} agent={agent} />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
