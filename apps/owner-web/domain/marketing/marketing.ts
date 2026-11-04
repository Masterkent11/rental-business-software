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
  { key: "posts", label: "Posts & Reels" },
  { key: "library", label: "Media Library" },
  { key: "calendar", label: "Publishing Calendar" },
  { key: "channels", label: "Connected Channels" },
  { key: "performance", label: "Performance" },
] as const;
export type MarketingTab = (typeof MARKETING_TABS)[number]["key"];
export function validateMarketingFile(file: Pick<File, "size" | "type">) {
  if (
    !["image/jpeg", "image/png", "image/webp", "video/mp4"].includes(file.type)
  )
    throw new Error("Choose a JPEG, PNG, WebP image or MP4 video.");
  if (
    !file.size ||
    file.size > (file.type === "video/mp4" ? 12 : 8) * 1024 * 1024
  )
    throw new Error("Images can be up to 8 MiB and MP4 videos up to 12 MiB.");
}
