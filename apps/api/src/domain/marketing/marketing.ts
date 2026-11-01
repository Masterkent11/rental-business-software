export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 12 * 1024 * 1024;
export const MEDIA_QUOTA_BYTES = 256 * 1024 * 1024;
export const MEDIA_QUOTA_COUNT = 100;
export type DraftState = "DRAFT" | "READY_FOR_REVIEW";
export type ContentState =
  | DraftState
  | "APPROVED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "CANCELLED"
  | "PARTIALLY_PUBLISHED"
  | "ACTION_REQUIRED";
export type MediaState = "PENDING" | "READY" | "FAILED" | "DELETING";
export class MarketingInvalidError extends Error {}
export class MarketingForbiddenError extends Error {}
export class MarketingNotFoundError extends Error {}
export class MarketingConflictError extends Error {}
export class MarketingUnavailableError extends Error {}
export interface MarketingMedia {
  readonly id: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly bytes: number;
  readonly storagePath: string;
  readonly state: MediaState;
  readonly createdAt: string;
}
export interface MarketingDraft {
  readonly id: string;
  readonly title: string;
  readonly caption: string;
  readonly listingId: string | null;
  readonly sourcePhotos: readonly string[];
  readonly mediaIds: readonly string[];
  readonly state: DraftState;
  readonly version: number;
  readonly updatedAt: string;
}
export interface DraftInput {
  readonly title: string;
  readonly caption: string;
  readonly listingId: string | null;
  readonly sourcePhotos: readonly string[];
  readonly mediaIds: readonly string[];
  readonly state: DraftState;
}
export interface MarketingProperty {
  readonly id: string;
  readonly title: string;
  readonly photos: readonly string[];
}
export function validateDraft(input: DraftInput): DraftInput {
  const title = input.title.trim(),
    caption = input.caption.trim();
  if (!title || title.length > 120 || caption.length > 2200)
    throw new MarketingInvalidError(
      "Use a title up to 120 characters and a caption up to 2200 characters.",
    );
  if (!["DRAFT", "READY_FOR_REVIEW"].includes(input.state))
    throw new MarketingInvalidError("External publishing is not available.");
  if (
    input.mediaIds.length + input.sourcePhotos.length > 10 ||
    new Set(input.mediaIds).size !== input.mediaIds.length ||
    new Set(input.sourcePhotos).size !== input.sourcePhotos.length
  )
    throw new MarketingInvalidError("Select up to 10 distinct media items.");
  if (!input.listingId && input.sourcePhotos.length)
    throw new MarketingInvalidError(
      "Choose an authorized property before selecting its photos.",
    );
  if (
    input.state === "READY_FOR_REVIEW" &&
    (!caption || !(input.mediaIds.length + input.sourcePhotos.length))
  )
    throw new MarketingInvalidError(
      "Add a caption and media before marking ready for review.",
    );
  return { ...input, title, caption };
}
