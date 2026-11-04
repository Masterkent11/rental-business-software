"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CalendarDays, Loader2, MessageSquare, RotateCw, SendHorizontal } from "lucide-react";

import { Page, TopBar } from "@/components/owner/shell";
import { Btn, Card, EmptyState, ErrorState, LinkBtn, SkeletonRows } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
import { formatDate } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useMessagesStore } from "@/stores/use-messages-store";
import { useSessionStore } from "@/stores/use-session-store";
import { MAX_MESSAGE_LENGTH, senderLabel } from "@/domain/messaging/conversation";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
const listTime = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return Date.now() - date.getTime() < 86_400_000 ? time(iso) : date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
};

function Thread({ basePath, viewer }: { basePath: string; viewer: "OWNER" | "AGENT" }) {
  const bottom = useRef<HTMLDivElement>(null);
  const {
    activeConversation,
    thread,
    threadLoading,
    threadError,
    hasMore,
    loadingOlder,
    composer,
    realtime,
    loadOlder,
    setComposer,
    send,
    retry,
    open,
    activeId,
  } = useMessagesStore();

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [thread.length, activeId]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const page = bottom.current?.closest<HTMLElement>(".partner-thread-open");
    if (!viewport || !page) return;
    const resize = () => {
      page.style.setProperty("--chat-height", `${viewport.height}px`);
      page.style.setProperty("--chat-top", `${viewport.offsetTop}px`);
    };
    resize();
    viewport.addEventListener("resize", resize);
    viewport.addEventListener("scroll", resize);
    return () => {
      viewport.removeEventListener("resize", resize);
      viewport.removeEventListener("scroll", resize);
      page.style.removeProperty("--chat-height");
      page.style.removeProperty("--chat-top");
    };
  }, [activeConversation?.id]);

  if (!activeConversation && threadLoading) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted" aria-label="Loading conversation" /></div>;
  }

  return (
    <div className="partner-thread flex min-h-0 flex-1 flex-col">
      {activeConversation ? (
        <div className="partner-thread-heading flex items-center gap-3 border-b border-border px-5 py-3.5">
          <Link href={basePath} className="focusable rounded-lg p-1.5 text-muted hover:bg-surface-secondary md:hidden" aria-label="Back to inbox">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <div className="size-10 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
            {activeConversation.listingPhoto ? <Photo src={activeConversation.listingPhoto} alt="" className="size-full" sizes="40px" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{activeConversation.customerName}</p>
            <p className="truncate text-[12.5px] text-muted">
              {activeConversation.listingTitle}
              {activeConversation.bookingStartsOn ? ` · ${formatDate(activeConversation.bookingStartsOn)} → ${formatDate(activeConversation.bookingEndsOn ?? activeConversation.bookingStartsOn)}` : ""}
            </p>
          </div>
          {activeConversation.bookingId && viewer === "OWNER" ? (
            <LinkBtn href={`/bookings?b=${activeConversation.bookingId}`} size="sm" variant="outline">
              <CalendarDays className="size-3.5" aria-hidden /> Booking
            </LinkBtn>
          ) : null}
        </div>
      ) : null}

      <div className="partner-thread-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4" aria-live="polite" aria-relevant="additions">
        {threadError ? (
          <ErrorState message={threadError} onRetry={() => activeId && void open(activeId)} />
        ) : (
          <div className="flex flex-col gap-2">
            {hasMore ? (
              <div className="flex justify-center pb-2">
                <Btn size="sm" variant="ghost" busy={loadingOlder} onClick={() => void loadOlder()}>
                  Load earlier messages
                </Btn>
              </div>
            ) : null}
            {thread.map((message, index) => {
              const mine = message.senderRole === viewer;
              const partner = !mine && message.senderRole !== "CUSTOMER";
              const showDay = index === 0 || day(thread[index - 1]!.createdAt) !== day(message.createdAt);
              return (
                <div key={message.clientId} className="flex flex-col">
                  {showDay ? <p className="my-3 text-center text-[11.5px] font-medium text-muted">{day(message.createdAt)}</p> : null}
                  <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed",
                        mine ? "rounded-br-md bg-foreground text-white" : "rounded-bl-md bg-surface-secondary text-foreground",
                        message.delivery === "failed" && "bg-danger-soft text-danger",
                      )}
                    >
                      {message.body}
                    </div>
                  </div>
                  <div className={cn("mt-0.5 flex items-center gap-1.5 px-1 text-[11px] text-muted", mine ? "justify-end" : "justify-start")}>
                    {partner && activeConversation ? <span className="font-medium">{senderLabel(message.senderRole, activeConversation, viewer)} ·</span> : null}
                    {message.delivery === "sending" ? <span>Sending…</span> : null}
                    {message.delivery === "failed" ? (
                      <button onClick={() => void retry(message.clientId)} className="focusable flex items-center gap-1 rounded font-medium text-danger">
                        <AlertCircle className="size-3" aria-hidden /> Not sent · Retry <RotateCw className="size-3" aria-hidden />
                      </button>
                    ) : null}
                    {message.delivery === "sent" ? <span>{time(message.createdAt)}</span> : null}
                  </div>
                </div>
              );
            })}
            {thread.length === 0 && !threadLoading ? <p className="py-10 text-center text-[13px] text-muted">No messages yet.</p> : null}
            <div ref={bottom} />
          </div>
        )}
      </div>

      <form
        className="partner-composer border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-3 py-2 focus-within:border-foreground/30">
          <label htmlFor="composer" className="sr-only">Reply</label>
          <textarea
            id="composer"
            rows={1}
            value={composer}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setComposer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Write a reply…"
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[14px] outline-none"
          />
          <Btn type="submit" size="sm" disabled={!composer.trim()} aria-label="Send reply" className="mb-1">
            <SendHorizontal className="size-4" aria-hidden />
          </Btn>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted">
          {realtime === "live" ? "Live — new messages appear instantly." : realtime === "offline" ? "Reconnecting… messages are still saved." : "Connecting…"}
        </p>
      </form>
    </div>
  );
}

function Inbox({ basePath }: { basePath: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const scope = useSessionStore((s) => s.scope);
  const viewer = scope?.kind === "AGENT" ? "AGENT" : "OWNER";
  const { conversations, loading, loaded, error, activeId, refresh, open, close } = useMessagesStore();
  const requested = search.get("c");
  const unreadOnly = viewer === "OWNER" && search.get("unread") === "1";
  const visibleConversations = unreadOnly ? conversations.filter(item => item.unreadCount > 0) : conversations;

  useEffect(() => {
    if (!loaded) return;
    if (requested && requested !== activeId) void open(requested);
    if (!requested && activeId) close();
  }, [requested, activeId, loaded, open, close]);

  if (!scope) return null;

  return (
    <Page wide className={cn("partner-messages", requested && "partner-thread-open")}>
      <TopBar title="Messages" caption={viewer === "AGENT" ? "Conversations with buyers and renters about the properties you represent." : "Conversations with customers about your listings and bookings."}>
        {unreadOnly ? <LinkBtn href={basePath} variant="outline">All messages</LinkBtn> : null}
      </TopBar>
      <Card className="partner-message-frame flex h-[calc(100dvh-170px)] min-h-[520px] overflow-hidden">
        <div className={cn("flex w-full flex-col border-r border-border md:w-[340px] md:shrink-0", requested && "hidden md:flex")}>
          {loading && !loaded ? (
            <SkeletonRows rows={6} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => void refresh()} />
          ) : visibleConversations.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="size-5" aria-hidden />}
              title={unreadOnly ? "No unread conversations" : "No conversations yet"}
              body="When a customer messages you from a listing or booking, it lands here in real time."
            />
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {visibleConversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    onClick={() => router.push(`${basePath}?c=${conversation.id}${unreadOnly ? "&unread=1" : ""}`, { scroll: false })}
                    aria-current={conversation.id === activeId ? "true" : undefined}
                    className={cn(
                      "focusable flex w-full items-start gap-3 border-b border-border/70 px-4 py-3.5 text-left transition-colors",
                      conversation.id === activeId ? "bg-surface-secondary" : "hover:bg-surface-secondary/50",
                    )}
                  >
                    <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
                      {conversation.listingPhoto ? <Photo src={conversation.listingPhoto} alt="" className="size-full" sizes="44px" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("truncate text-[13.5px]", conversation.unreadCount > 0 ? "font-bold" : "font-semibold")}>{conversation.customerName}</p>
                        <span className="shrink-0 text-[11px] text-muted">{listTime(conversation.lastMessageAt)}</span>
                      </div>
                      <p className="truncate text-[12px] text-muted">
                        {conversation.listingIntent === "SALE" ? "For sale · " : ""}
                        {conversation.listingTitle}
                        {viewer === "OWNER" && conversation.agentName ? ` · ${conversation.agentName}` : ""}
                      </p>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className={cn("truncate text-[12.5px]", conversation.unreadCount > 0 ? "text-foreground" : "text-muted")}>
                          {conversation.lastSenderRole === viewer ? "You: " : conversation.lastSenderRole && conversation.lastSenderRole !== "CUSTOMER" ? `${senderLabel(conversation.lastSenderRole, conversation, viewer)}: ` : ""}
                          {conversation.lastMessagePreview}
                        </p>
                        {conversation.unreadCount > 0 ? (
                          <span className="tabular shrink-0 rounded-full bg-foreground px-1.5 text-[11px] font-semibold text-white" aria-label={`${conversation.unreadCount} unread`}>
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cn("min-w-0 flex-1 flex-col", requested ? "flex" : "hidden md:flex")}>
          {requested ? (
            <Thread basePath={basePath} viewer={viewer} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState icon={<MessageSquare className="size-5" aria-hidden />} title="Select a conversation" body="Pick a conversation on the left to read and reply." />
            </div>
          )}
        </div>
      </Card>
    </Page>
  );
}

export function MessagesInbox({ basePath }: { basePath: string }) {
  return (
    <Suspense fallback={null}>
      <Inbox basePath={basePath} />
    </Suspense>
  );
}
