"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FilePenLine, Plus } from "lucide-react";
import { Page, TopBar } from "@/components/owner/shell";
import { Btn, ErrorState, Skeleton } from "@/components/owner/ui";
import { useSessionStore } from "@/stores/use-session-store";
import { useMarketingStore } from "@/stores/use-marketing-store";
import { MARKETING_TABS } from "@/domain/marketing/marketing";
import { MarketingEditor } from "./marketing-editor";
import { MarketingLibrary, MarketingMediaPreview } from "./marketing-library";
import "./marketing.css";
function DraftList() {
  const s = useMarketingStore();
  return !s.snapshot?.drafts.length ? (
    <div className="marketing-empty">
      <FilePenLine size={30} aria-hidden />
      <h3>No drafts yet</h3>
      <p>Choose a property or start with general content.</p>
      <Btn onClick={() => s.edit()}>Create your first draft</Btn>
    </div>
  ) : (
    <ul className="marketing-draft-list">
      {s.snapshot.drafts.map((d) => (
        <li key={d.id}>
          <div>
            <Link href="/agent/marketing?tab=posts" onClick={() => s.edit(d)}>
              {d.title}
            </Link>
            <p>
              {d.actionRequired
                ? "Property access changed"
                : d.state === "DRAFT"
                  ? "Draft"
                  : "Ready for review"}{" "}
              · Updated{" "}
              {new Date(d.updatedAt).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="marketing-row-actions">
            <Link
              className="marketing-text-button"
              href="/agent/marketing?tab=posts"
              onClick={() => s.edit(d)}
            >
              Edit
            </Link>
            <button
              className="marketing-text-button"
              disabled={s.busy || d.actionRequired}
              onClick={() => void s.duplicate(d.id)}
            >
              Duplicate
            </button>
            <button
              className="marketing-text-button marketing-delete"
              disabled={s.busy}
              onClick={() => void s.removeDraft(d.id)}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
function FutureView({ tab }: { tab: string }) {
  const s = useMarketingStore();
  if (tab === "channels")
    return (
      <section>
        <h2>Connected Channels</h2>
        <p className="marketing-muted">
          Account connections require a separately approved provider
          integration.
        </p>
        <ul className="marketing-channel-list">
          {[
            ["Facebook Pages", "Not available yet"],
            ["Instagram professional accounts", "Not available yet"],
            ["TikTok", "Not available yet"],
          ].map(([name, status]) => (
            <li key={name}>
              <strong>{name}</strong>
              <span>{status}</span>
            </li>
          ))}
        </ul>
        <p className="marketing-muted">
          No channels are connected through Marketing Hub. An Owner channel will
          require explicit delegation.
        </p>
      </section>
    );
  if (tab === "calendar")
    return (
      <section>
        <h2>Publishing Calendar</h2>
        <p className="marketing-muted">
          Scheduling is not available yet. Draft activity below is not a
          publication schedule.
        </p>
        <DraftList />
      </section>
    );
  return (
    <section>
      <h2>Performance</h2>
      <div className="marketing-empty">
        <h3>No publishing metrics yet</h3>
        <p>
          Publication results will appear after approved channels are available.
          Your {s.snapshot?.drafts.length ?? 0} internal drafts have not been
          published through this hub.
        </p>
        <Link href="/agent/marketing?tab=posts">View drafts</Link>
      </div>
    </section>
  );
}
export function MarketingHub() {
  const s = useMarketingStore();
  const user = useSessionStore((v) => v.user),
    workspace = useSessionStore((v) => v.activeWorkspace);
  const params = useSearchParams();
  const tab =
    MARKETING_TABS.find((t) => t.key === params.get("tab"))?.key ?? "overview";
  const scope =
    user && workspace?.kind === "AGENT"
      ? `${user.id}:${workspace.agentId}`
      : null;
  useEffect(() => {
    useMarketingStore.getState().setScope(scope);
    if (scope) void useMarketingStore.getState().load();
  }, [scope]);
  if (!scope) return null;
  return (
    <Page wide>
      <div className="marketing-hub">
        <TopBar
          title="Marketing Hub"
          caption="Prepare property content and manage your drafts."
        >
          <Link
            href="/agent/marketing?tab=posts"
            onClick={() => s.edit()}
            className="marketing-new"
          >
            <Plus size={17} aria-hidden />
            Create content
          </Link>
        </TopBar>
        <nav className="marketing-tabs" aria-label="Marketing Hub">
          {MARKETING_TABS.map((t) => (
            <Link
              key={t.key}
              href={"/agent/marketing?tab=" + t.key}
              aria-current={tab === t.key ? "page" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {s.notice ? (
          <p className="marketing-notice" role="status">
            {s.notice}
          </p>
        ) : null}
        {s.problem ? (
          <div className="marketing-error" role="alert">
            <ErrorState message={s.problem} onRetry={() => void s.load()} />
          </div>
        ) : null}
        {s.loading && !s.snapshot ? (
          <div aria-label="Loading Marketing Hub">
            <Skeleton className="my-6 h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : s.snapshot ? (
          <>
            {tab === "library" ? (
              <MarketingLibrary />
            ) : tab === "posts" || tab === "overview" ? (
              <>
                {s.editorOpen ? (
                  <MarketingEditor />
                ) : (
                  <>
                    {tab === "overview" ? (
                      <>
                        <div className="marketing-summary">
                          <div>
                            <span>Drafts</span>
                            <strong>
                              {
                                s.snapshot.drafts.filter(
                                  (d) => d.state === "DRAFT",
                                ).length
                              }
                            </strong>
                          </div>
                          <div>
                            <span>Ready for review</span>
                            <strong>
                              {
                                s.snapshot.drafts.filter(
                                  (d) => d.state === "READY_FOR_REVIEW",
                                ).length
                              }
                            </strong>
                          </div>
                          <div>
                            <span>Library files</span>
                            <strong>
                              {
                                s.snapshot.media.filter(
                                  (m) => m.state === "READY",
                                ).length
                              }
                            </strong>
                          </div>
                        </div>
                        <div className="marketing-readiness">
                          <h2>Prepare content for review.</h2>
                          <p>
                            Keep your media and captions together. Social
                            account connections and external publishing are not
                            available in this phase.
                          </p>
                          <Link href="/agent/marketing?tab=channels">
                            View channel availability
                          </Link>
                        </div>
                      </>
                    ) : null}
                    <div className="marketing-section-heading">
                      <h2>
                        {tab === "overview" ? "Recent drafts" : "Posts & Reels"}
                      </h2>
                      <Link
                        href="/agent/marketing?tab=posts"
                        className="marketing-text-button"
                        onClick={() => s.edit()}
                      >
                        New draft
                      </Link>
                    </div>
                    <DraftList />
                  </>
                )}
              </>
            ) : (
              <FutureView tab={tab} />
            )}
            <MarketingMediaPreview />
          </>
        ) : null}
      </div>
    </Page>
  );
}
