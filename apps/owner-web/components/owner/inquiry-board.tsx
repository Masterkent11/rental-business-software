"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import Link from "next/link";
import { Inbox, MessageSquare, Wallet, X } from "lucide-react";

import { Page, TopBar } from "@/components/owner/shell";
import { Badge, Btn, Card, EmptyState, ErrorState, Field, InlineError, LinkBtn, SegmentedTabs, SkeletonRows, TextInput } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
import { formatDateTime, peso } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  INQUIRY_STATUS_LABEL,
  PIPELINE,
  groupByStatus,
  nextStatuses,
  type Inquiry,
  type InquiryStatus,
} from "@/domain/inquiries/inquiry";
import { useEngagementStore } from "@/stores/use-engagement-store";
import { useAgentStore } from "@/stores/use-agent-store";
import { useSessionStore } from "@/stores/use-session-store";

const statusTone = (status: InquiryStatus) =>
  status === "NEW" ? "dark" : status === "CLOSED" ? "ok" : status === "LOST" ? "bad" : status === "VIEWING_SCHEDULED" ? "info" : "pending";

function LeadCard({ inquiry, onOpen, selected }: { inquiry: Inquiry; onOpen: () => void; selected: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={selected}
      className={cn(
        "focusable flex w-full flex-col gap-1.5 rounded-xl border bg-surface p-3 text-left transition-colors",
        selected ? "border-foreground" : "border-border hover:border-foreground/25",
      )}
    >
      <span className="truncate text-[13px] font-semibold">{inquiry.customerName}</span>
      <span className="truncate text-[12px] text-muted">{inquiry.listingTitle}</span>
      <span className="flex items-center justify-between gap-2 text-[11.5px] text-muted">
        <span>{formatDateTime(inquiry.createdAt)}</span>
        {inquiry.buyerBudgetCentavos ? <Wallet className="size-3.5" aria-label="Shared a budget" /> : null}
      </span>
    </button>
  );
}

function LeadDetail({ inquiry, messagesPath, agent }: { inquiry: Inquiry; messagesPath: string; agent: boolean }) {
  const { busyId, actionError, lostReason, setLostReason, move, selectInquiry } = useEngagementStore();
  const setTaskInquiry = useAgentStore((s) => s.setTaskInquiry);
  const options = nextStatuses(inquiry.status);
  const busy = busyId === inquiry.id;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-semibold">{inquiry.customerName}</p>
          <p className="mt-0.5 text-[12.5px] text-muted">{formatDateTime(inquiry.createdAt)}</p>
        </div>
        <button type="button" onClick={() => selectInquiry(null)} aria-label="Close lead" className="focusable rounded-lg p-1.5 text-muted hover:bg-surface-secondary">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-surface-secondary/60 p-2.5">
        <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
          {inquiry.listingPhoto ? <Photo src={inquiry.listingPhoto} alt="" className="size-full" sizes="48px" /> : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">{inquiry.listingTitle}</p>
          <p className="truncate text-[12px] text-muted">
            {inquiry.areaLabel}, {inquiry.cityLabel}
            {!agent && inquiry.agentName ? ` · Agent: ${inquiry.agentName}` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(inquiry.status)}>{INQUIRY_STATUS_LABEL[inquiry.status]}</Badge>
        {inquiry.firstResponseAt ? <span className="text-[12px] text-muted">First reply {formatDateTime(inquiry.firstResponseAt)}</span> : <span className="text-[12px] text-warning">Not answered yet</span>}
      </div>
      {inquiry.questions.length > 0 ? (
        <div>
          <p className="text-[12px] font-medium text-muted">Asked about</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {inquiry.questions.map((q) => (
              <li key={q} className="rounded-full border border-border px-2.5 py-1 text-[12px]">
                {q}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {inquiry.message ? (
        <div>
          <p className="text-[12px] font-medium text-muted">Message</p>
          <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed">{inquiry.message}</p>
        </div>
      ) : null}
      {inquiry.buyerBudgetCentavos ? (
        <div className="rounded-xl border border-border px-3.5 py-2.5">
          <p className="text-[12px] font-medium text-muted">Buyer&apos;s private budget</p>
          <p className="tabular mt-0.5 text-[15px] font-semibold">{peso(inquiry.buyerBudgetCentavos)}</p>
          <p className="mt-0.5 text-[11.5px] text-muted">Shared only with you. Never shown publicly.</p>
        </div>
      ) : null}
      {inquiry.lostReason ? <p className="text-[12.5px] text-muted">Lost: {inquiry.lostReason}</p> : null}
      <div className="flex flex-wrap gap-2">
        <LinkBtn href={`${messagesPath}?c=${inquiry.conversationId}`} size="sm">
          <MessageSquare className="size-3.5" aria-hidden /> Open conversation
        </LinkBtn>
        {agent ? (
          <Link
            href="/agent/tasks"
            onClick={() => setTaskInquiry(inquiry.id)}
            className="focusable inline-flex h-8 items-center rounded-xl border border-border px-3 text-[12.5px] font-medium hover:bg-surface-secondary"
          >
            Add follow-up
          </Link>
        ) : null}
      </div>
      {options.length > 0 ? (
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-[12.5px] font-semibold">Move to</p>
          <div className="flex flex-wrap gap-1.5">
            {options
              .filter((s) => s !== "LOST")
              .map((status) => (
                <Btn key={status} size="sm" variant="outline" disabled={busy} onClick={() => void move(inquiry, status)}>
                  {INQUIRY_STATUS_LABEL[status]}
                </Btn>
              ))}
          </div>
          {options.includes("LOST") ? (
            <form
              noValidate
              className="mt-3 flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void move(inquiry, "LOST");
              }}
            >
              <Field label="Reason (optional)" htmlFor="lostReason" className="flex-1">
                <TextInput id="lostReason" value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Bought elsewhere" maxLength={200} />
              </Field>
              <Btn type="submit" size="md" variant="danger" busy={busy}>
                Mark lost
              </Btn>
            </form>
          ) : null}
        </div>
      ) : null}
      <InlineError message={actionError} />
    </Card>
  );
}

function InquiryBoardContent() {
  const search = useSearchParams();
  const scope = useSessionStore((s) => s.scope);
  const { inquiries: allInquiries, inquiriesLoaded, inquiriesError, selectedInquiryId, view, selectInquiry, setView, loadInquiries } = useEngagementStore();
  const requestedInquiry = search.get("inquiry");
  useEffect(()=>{if(requestedInquiry && allInquiries.some(item=>item.id===requestedInquiry))selectInquiry(requestedInquiry);},[requestedInquiry,allInquiries,selectInquiry]);
  if (!scope) return null;
  const agent = scope.kind === "AGENT";
  const messagesPath = agent ? "/agent/messages" : "/messages";
  const newOnly = !agent && search.get("status") === "NEW";
  const inquiries = newOnly ? allInquiries.filter(item => item.status === "NEW") : allInquiries;
  const listingId = search.get("listingId");
  const filteredInquiries = listingId ? inquiries.filter(item => item.listingId === listingId) : inquiries;
  const groups = groupByStatus(filteredInquiries);
  const selected = filteredInquiries.find((i) => i.id === selectedInquiryId) ?? null;

  return (
    <Page wide>
      <TopBar
        title={agent ? "Leads" : "Inquiries"}
        caption={agent ? "Buyers and renters who asked about properties you represent." : "Questions from buyers and renters about your listings, tracked from first message to close."}
      >
        {newOnly ? <LinkBtn href="/inquiries" variant="outline">All inquiries</LinkBtn> : null}
        <SegmentedTabs<"board" | "list">
          label="Layout"
          value={view}
          onChange={setView}
          options={[
            { value: "board", label: "Pipeline" },
            { value: "list", label: "List" },
          ]}
        />
      </TopBar>
      {!inquiriesLoaded ? (
        <Card>
          <SkeletonRows rows={5} />
        </Card>
      ) : inquiriesError && filteredInquiries.length === 0 ? (
        <Card>
          <ErrorState message={inquiriesError} onRetry={() => void loadInquiries()} />
        </Card>
      ) : filteredInquiries.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox className="size-5" aria-hidden />}
            title="No inquiries yet"
            body="When someone taps Inquire Now on a listing, the lead appears here in real time with their questions and the conversation."
          />
        </Card>
      ) : (
        <div className={cn("grid gap-5", selected ? "xl:grid-cols-[1fr_380px]" : "")}>
          {view === "board" ? (
            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[1100px] grid-cols-7 gap-3">
                {PIPELINE.map((status) => (
                  <section key={status} aria-label={INQUIRY_STATUS_LABEL[status]} className="flex flex-col gap-2 rounded-2xl bg-surface-secondary/60 p-2.5">
                    <header className="flex items-center justify-between px-1">
                      <h2 className="text-[12.5px] font-semibold">{INQUIRY_STATUS_LABEL[status]}</h2>
                      <span className="tabular text-[12px] text-muted">{groups[status].length}</span>
                    </header>
                    {groups[status].map((inquiry) => (
                      <LeadCard key={inquiry.id} inquiry={inquiry} selected={inquiry.id === selectedInquiryId} onOpen={() => selectInquiry(inquiry.id)} />
                    ))}
                  </section>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <ul className="divide-y divide-border">
                {filteredInquiries.map((inquiry) => (
                  <li key={inquiry.id}>
                    <button
                      type="button"
                      onClick={() => selectInquiry(inquiry.id)}
                      className={cn("focusable flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-surface-secondary/50", inquiry.id === selectedInquiryId && "bg-surface-secondary")}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold">{inquiry.customerName}</p>
                        <p className="truncate text-[12.5px] text-muted">{inquiry.listingTitle}</p>
                      </div>
                      <span className="hidden text-[12px] text-muted sm:block">{formatDateTime(inquiry.createdAt)}</span>
                      <Badge tone={statusTone(inquiry.status)}>{INQUIRY_STATUS_LABEL[inquiry.status]}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {selected ? <LeadDetail inquiry={selected} messagesPath={messagesPath} agent={agent} /> : null}
        </div>
      )}
    </Page>
  );
}

export function InquiryBoard() { return <Suspense fallback={null}><InquiryBoardContent /></Suspense>; }
