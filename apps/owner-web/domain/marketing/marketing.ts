export interface MarketingMedia {
  id: string;
  fileName: string;
  contentType: string;
  bytes: number;
  state: "PENDING" | "READY" | "FAILED" | "DELETING";
  createdAt: string;
}
export interface MarketingDraftInput {
  title: string;
  caption: string;
  listingId: string | null;
  sourcePhotos: readonly string[];
  mediaIds: readonly string[];
  state: "DRAFT" | "READY_FOR_REVIEW";
}
export interface MarketingDraft extends MarketingDraftInput {
  id: string;
  version: number;
  updatedAt: string;
  actionRequired?: boolean;
}
export interface MarketingProperty {
  id: string;
  title: string;
  photos: readonly string[];
  location?: string;
}
export interface MarketingSnapshot {
  media: readonly MarketingMedia[];
  drafts: readonly MarketingDraft[];
  properties: readonly MarketingProperty[];
}
export const emptyMarketingDraft = (): MarketingDraftInput => ({
  title: "",
  caption: "",
  listingId: null,
  sourcePhotos: [],
  mediaIds: [],
  state: "DRAFT",
});
export const MARKETING_TABS = [
  { key: "overview", label: "Overview" },
  { key: "posts", label: "Content" },
  { key: "library", label: "Media" },
  { key: "calendar", label: "Calendar" },
  { key: "channels", label: "Channels" },
  { key: "performance", label: "Analytics" },
] as const;
export type MarketingTab = (typeof MARKETING_TABS)[number]["key"];
export type MarketingFormat = "photo" | "video";
export const MARKETING_IMAGE_TYPES = "image/jpeg,image/png,image/webp";
export const MARKETING_VIDEO_TYPE = "video/mp4";
export const MARKETING_FILE_TYPES = `${MARKETING_IMAGE_TYPES},${MARKETING_VIDEO_TYPE}`;

export function marketingMediaFormat(contentType: string): MarketingFormat {
  return contentType === MARKETING_VIDEO_TYPE ? "video" : "photo";
}

export function marketingDraftFormat(
  draft: MarketingDraftInput,
  media: readonly MarketingMedia[],
): MarketingFormat {
  return media.some(
    (asset) =>
      draft.mediaIds.includes(asset.id) &&
      marketingMediaFormat(asset.contentType) === "video",
  )
    ? "video"
    : "photo";
}

export function marketingDraftTitle(input: MarketingDraftInput): string {
  return (
    input.title.trim() ||
    input.caption.trim().split(/\r?\n/, 1)[0]?.slice(0, 120).trim() ||
    "Untitled draft"
  );
}

export function marketingHref(tab: MarketingTab, draft?: string) {
  const params = new URLSearchParams({ tab });
  if (tab === "posts" && draft) params.set("draft", draft);
  return `/agent/marketing?${params}`;
}

export function validateMarketingFile(file: Pick<File, "size" | "type">) {
  if (!MARKETING_FILE_TYPES.split(",").includes(file.type))
    throw new Error("Choose a JPEG, PNG, WebP image or MP4 video.");
  if (
    !file.size ||
    file.size > (file.type === MARKETING_VIDEO_TYPE ? 12 : 8) * 1024 * 1024
  )
    throw new Error("Images can be up to 8 MiB and MP4 videos up to 12 MiB.");
}

export interface FacebookPage {
  readonly id: string;
  readonly name: string;
}

export interface FacebookChannel {
  readonly enabled: boolean;
  readonly connection: (FacebookPage & { readonly connectedAt: string }) | null;
  readonly selection: {
    readonly id: string;
    readonly pages: readonly FacebookPage[];
  } | null;
}

export type FacebookAuthorizationOutcome =
  | "SELECT_PAGE"
  | "NO_ELIGIBLE_PAGES"
  | "CANCELLED";
