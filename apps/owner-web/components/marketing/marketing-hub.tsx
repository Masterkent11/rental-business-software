"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, ChartNoAxesColumn, Plus } from "lucide-react";
import { Page, TopBar } from "@/components/owner/shell";
import { ErrorState, Skeleton } from "@/components/owner/ui";
import { useSessionStore } from "@/stores/use-session-store";
import {
  isMarketingEditorDirty,
  useMarketingStore,
} from "@/stores/use-marketing-store";
import {
  MARKETING_TABS,
  marketingHref,
  type MarketingSnapshot,
} from "@/domain/marketing/marketing";
import {
  MarketingChannels,
  MarketingChannelSummary,
} from "./marketing-channels";
import { MarketingContent, MarketingDraftList } from "./marketing-content";
import { MarketingEditor } from "./marketing-editor";
import { MarketingLibrary } from "./marketing-library";
import "./marketing.css";

function Overview({ snapshot }: { snapshot: MarketingSnapshot }) {
  const drafts = snapshot.drafts.filter(
    (draft) => draft.state === "DRAFT",
  ).length;
  return (
    <>
      <dl className="marketing-summary">
        <div>
          <dt>Drafts</dt>
          <dd>{drafts}</dd>
        </div>
        <div>
          <dt>Ready for review</dt>
          <dd>{snapshot.drafts.length - drafts}</dd>
        </div>
        <div>
          <dt>Scheduled</dt>
          <dd className="marketing-unavailable">Unavailable</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd className="marketing-unavailable">Unavailable</dd>
        </div>
      </dl>
      <MarketingChannelSummary />
      <div className="marketing-section-heading">
        <h2>Recent content</h2>
        <Link href={marketingHref("posts")}>View all content</Link>
      </div>
      <MarketingDraftList drafts={snapshot.drafts.slice(0, 5)} />
    </>
  );
}

function PublicationUnavailable({ calendar }: { calendar: boolean }) {
  const Icon = calendar ? CalendarDays : ChartNoAxesColumn;
  return (
    <section className="marketing-empty">
      <Icon size={28} aria-hidden />
      <h2>{calendar ? "Calendar" : "Analytics"}</h2>
      <h3>
        {calendar
          ? "Scheduling is not available yet"
          : "No publishing metrics yet"}
      </h3>
      <p>
        {calendar
          ? "Scheduled posts and publication times will appear here when scheduling is supported."
          : "Verified channel metrics will appear here when publishing and reporting are supported."}
      </p>
      <Link href={marketingHref("posts")}>View content</Link>
    </section>
  );
}

export function MarketingHub() {
  const s = useMarketingStore();
  const user = useSessionStore((state) => state.user);
  const workspace = useSessionStore((state) => state.activeWorkspace);
  const params = useSearchParams();
  const tab =
    MARKETING_TABS.find((item) => item.key === params.get("tab"))?.key ??
    "overview";
  const requestedDraft = tab === "posts" ? params.get("draft") : null;
  const scope =
    user && workspace?.kind === "AGENT"
      ? `${user.id}:${workspace.agentId}`
      : null;
  const snapshot = s.scope === scope ? s.snapshot : null;
  const dirty = isMarketingEditorDirty(s);
  const openDraft = s.editorOpen ? (s.editingId ?? "new") : null;
  const requestedRecord = snapshot?.drafts.find(
    (draft) => draft.id === requestedDraft,
  );
  const requestedExists = requestedDraft === "new" || Boolean(requestedRecord);
  const showEditor = Boolean(
    snapshot && requestedDraft && requestedDraft === openDraft,
  );
  const pendingRecovery = dirty && !showEditor;

  useEffect(() => {
    const store = useMarketingStore.getState();
    store.setScope(scope);
    if (scope) void store.load();
  }, [scope]);

  useEffect(() => {
    if (!snapshot || s.busy) return;
    const current = new URLSearchParams(window.location.search);
    const liveRequest =
      current.get("tab") === "posts" ? current.get("draft") : null;
    if (requestedDraft !== liveRequest || requestedDraft === openDraft || dirty)
      return;
    const store = useMarketingStore.getState();
    if (requestedExists) store.edit(requestedRecord);
    else if (store.editorOpen) store.closeEditor();
  }, [
    snapshot,
    s.busy,
    requestedDraft,
    openDraft,
    dirty,
    requestedExists,
    requestedRecord,
  ]);

  function returnToContent() {
    const current = new URLSearchParams(window.location.search);
    if (
      window.location.pathname === "/agent/marketing" &&
      current.get("tab") === "posts" &&
      current.get("draft") === requestedDraft
    ) {
      window.history.replaceState(null, "", marketingHref("posts"));
    }
  }

  function cancel() {
    if (
      s.busy ||
      (dirty && !window.confirm("Discard unsaved changes to this draft?"))
    )
      return;
    returnToContent();
    s.closeEditor();
  }

  if (!scope) return null;
  return (
    <Page wide>
      <div className="marketing-hub">
        <TopBar
          title="Marketing Hub"
          caption="Create posts, reuse media and manage your publishing channels."
        >
          <Link href={marketingHref("posts", "new")} className="marketing-new">
            <Plus size={17} aria-hidden /> Create post
          </Link>
        </TopBar>
        <nav className="marketing-tabs" aria-label="Marketing Hub">
          {MARKETING_TABS.map((item) => (
            <Link
              key={item.key}
              href={marketingHref(item.key)}
              aria-current={tab === item.key ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {pendingRecovery && (
          <div className="marketing-recovery">
            <p role="status">You have unsaved changes in the composer.</p>
            <div className="marketing-row-actions">
              <Link href={marketingHref("posts", openDraft ?? "new")}>
                Resume editing
              </Link>
              <button
                type="button"
                className="marketing-text-button"
                disabled={s.busy}
                onClick={() => {
                  if (window.confirm("Discard unsaved changes to this draft?"))
                    s.closeEditor();
                }}
              >
                Discard changes
              </button>
            </div>
          </div>
        )}
        {!showEditor && s.notice && (tab === "posts" || tab === "library") && (
          <p className="marketing-notice" role="status">
            {s.notice}
          </p>
        )}
        {!showEditor &&
          s.problem &&
          (tab === "posts" || tab === "library" || tab === "overview") &&
          (snapshot ? (
            <p className="marketing-warning" role="alert">
              {s.problem}
            </p>
          ) : (
            <div className="marketing-error" role="alert">
              <ErrorState message={s.problem} onRetry={() => void s.load()} />
            </div>
          ))}

        {tab === "channels" ? (
          <MarketingChannels key={scope} />
        ) : tab === "calendar" || tab === "performance" ? (
          <PublicationUnavailable calendar={tab === "calendar"} />
        ) : !snapshot ? (
          (!s.problem || s.loading) && (
            <div aria-label="Loading Marketing Hub">
              <Skeleton className="my-6 h-20 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          )
        ) : tab === "overview" ? (
          <Overview key={scope} snapshot={snapshot} />
        ) : tab === "library" ? (
          <MarketingLibrary key={scope} />
        ) : (
          <MarketingContent key={scope} snapshot={snapshot} />
        )}

        {snapshot && requestedDraft && !requestedExists && !showEditor && (
          <div className="marketing-warning" role="alert">
            This draft is unavailable.{" "}
            <Link href={marketingHref("posts")}>Back to content</Link>
          </div>
        )}
        {showEditor && (
          <MarketingEditor
            key={`${scope}:${openDraft}`}
            onCancel={cancel}
            onSaved={returnToContent}
          />
        )}
      </div>
    </Page>
  );
}
