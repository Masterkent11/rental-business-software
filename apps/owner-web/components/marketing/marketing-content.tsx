"use client";

import { useMemo } from "react";
import { createStore, useStore } from "zustand";
import Link from "next/link";
import { FilePenLine, LayoutGrid, List } from "lucide-react";
import { Badge, Btn, Field, Select, TextInput } from "@/components/owner/ui";
import {
  marketingDraftFormat,
  marketingHref,
  type MarketingDraft,
  type MarketingSnapshot,
} from "@/domain/marketing/marketing";
import { useMarketingStore } from "@/stores/use-marketing-store";

const updatedDate = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });

export function MarketingDraftList({
  drafts,
  editable = false,
  grid = false,
}: {
  drafts: readonly MarketingDraft[];
  editable?: boolean;
  grid?: boolean;
}) {
  const { busy, duplicate, removeDraft, snapshot } = useMarketingStore();
  if (!drafts.length)
    return (
      <div className="marketing-empty">
        <FilePenLine size={26} aria-hidden />
        <h3>No drafts yet</h3>
        <p>
          Use Create post to start with your own media or an authorized
          property.
        </p>
      </div>
    );

  return (
    <ul className="marketing-draft-list" data-grid={grid}>
      {drafts.map((draft) => (
        <li key={draft.id}>
          <div className="marketing-draft-info">
            <Link href={marketingHref("posts", draft.id)}>{draft.title}</Link>
            {editable && draft.caption && (
              <p className="marketing-draft-excerpt">{draft.caption}</p>
            )}
            <div className="marketing-draft-meta">
              <Badge tone={draft.actionRequired ? "pending" : "neutral"}>
                {draft.actionRequired
                  ? "Property access changed"
                  : draft.state === "DRAFT"
                    ? "Draft"
                    : "Ready for review"}
              </Badge>
              {editable && (
                <span>
                  {marketingDraftFormat(draft, snapshot?.media ?? []) ===
                  "video"
                    ? "Video / Reel"
                    : "Photo post"}
                </span>
              )}
              <time dateTime={draft.updatedAt}>
                {updatedDate.format(new Date(draft.updatedAt))}
              </time>
            </div>
          </div>
          {editable && (
            <div className="marketing-row-actions">
              <Link
                className="marketing-text-button"
                href={marketingHref("posts", draft.id)}
                aria-label={`Edit ${draft.title}`}
              >
                Edit
              </Link>
              <button
                className="marketing-text-button"
                disabled={busy || draft.actionRequired}
                onClick={() => void duplicate(draft.id)}
              >
                Duplicate
              </button>
              <button
                className="marketing-text-button marketing-delete"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Delete “${draft.title}”?`))
                    void removeDraft(draft.id);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function MarketingContent({
  snapshot,
}: {
  snapshot: MarketingSnapshot;
}) {
  const filters = useMemo(
    () =>
      createStore(() => ({
        query: "",
        format: "all",
        platform: "all",
        status: "all",
        order: "newest",
        grid: false,
      })),
    [],
  );
  const { query, format, platform, status, order, grid } = useStore(filters);
  const publicationFilter = ["SCHEDULED", "PUBLISHED", "FAILED"].includes(
    status,
  );
  const destinationFilter = !["all", "none"].includes(platform);
  const drafts = snapshot.drafts
    .filter(
      (draft) =>
        !publicationFilter &&
        !destinationFilter &&
        (status === "all" || status === draft.state) &&
        (format === "all" ||
          format === marketingDraftFormat(draft, snapshot.media)) &&
        `${draft.title} ${draft.caption}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
    )
    .sort((a, b) =>
      order === "newest"
        ? Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
        : Date.parse(a.updatedAt) - Date.parse(b.updatedAt),
    );

  return (
    <section aria-labelledby="marketing-content-heading">
      <div className="marketing-section-heading">
        <h2 id="marketing-content-heading">Content</h2>
        <div
          className="marketing-view-options"
          role="group"
          aria-label="Content layout"
        >
          <Btn
            size="sm"
            variant={grid ? "outline" : "secondary"}
            aria-label="List view"
            aria-pressed={!grid}
            onClick={() => filters.setState({ grid: false })}
          >
            <List size={17} />
          </Btn>
          <Btn
            size="sm"
            variant={grid ? "secondary" : "outline"}
            aria-label="Grid view"
            aria-pressed={grid}
            onClick={() => filters.setState({ grid: true })}
          >
            <LayoutGrid size={17} />
          </Btn>
        </div>
      </div>
      <div className="marketing-filters">
        <Field label="Search content" htmlFor="marketing-content-search">
          <TextInput
            id="marketing-content-search"
            type="search"
            value={query}
            onChange={(event) =>
              filters.setState({ query: event.target.value })
            }
            placeholder="Title or caption"
          />
        </Field>
        <Field label="Content type" htmlFor="marketing-content-format">
          <Select
            id="marketing-content-format"
            value={format}
            onChange={(event) =>
              filters.setState({ format: event.target.value })
            }
          >
            <option value="all">All types</option>
            <option value="photo">Photo post</option>
            <option value="video">Video / Reel</option>
          </Select>
        </Field>
        <Field label="Platform" htmlFor="marketing-content-platform">
          <Select
            id="marketing-content-platform"
            value={platform}
            onChange={(event) =>
              filters.setState({ platform: event.target.value })
            }
          >
            <option value="all">All platforms</option>
            <option value="none">No destination</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
          </Select>
        </Field>
        <Field label="Status" htmlFor="marketing-content-status">
          <Select
            id="marketing-content-status"
            value={status}
            onChange={(event) =>
              filters.setState({ status: event.target.value })
            }
          >
            <option value="all">All statuses</option>
            <option value="DRAFT">Drafts</option>
            <option value="READY_FOR_REVIEW">Ready for review</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PUBLISHED">Published</option>
            <option value="FAILED">Failed</option>
          </Select>
        </Field>
        <Field label="Sort by date" htmlFor="marketing-content-order">
          <Select
            id="marketing-content-order"
            value={order}
            onChange={(event) =>
              filters.setState({ order: event.target.value })
            }
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </Select>
        </Field>
      </div>
      {publicationFilter || destinationFilter ? (
        <div className="marketing-empty">
          <h3>Publishing activity is unavailable</h3>
          <p>
            Posts saved here are internal drafts. Channel delivery details will
            appear once publishing is supported.
          </p>
        </div>
      ) : drafts.length || !snapshot.drafts.length ? (
        <MarketingDraftList drafts={drafts} editable grid={grid} />
      ) : (
        <div className="marketing-empty">
          <h3>No matching content</h3>
          <p>Try a different keyword or filter.</p>
        </div>
      )}
    </section>
  );
}
