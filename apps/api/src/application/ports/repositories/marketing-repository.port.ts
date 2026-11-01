import type {
  DraftInput,
  MarketingDraft,
  MarketingMedia,
  MediaState,
} from "@/domain/marketing/marketing.ts";
export interface MarketingRepository {
  listMedia(userId: string): Promise<readonly MarketingMedia[]>;
  findMedia(userId: string, id: string): Promise<MarketingMedia | null>;
  reserveMedia(
    userId: string,
    input: { fileName: string; contentType: string; bytes: number },
  ): Promise<MarketingMedia>;
  setMediaState(userId: string, id: string, state: MediaState): Promise<void>;
  beginMediaRemoval(userId: string, id: string): Promise<MarketingMedia>;
  removeMedia(userId: string, id: string): Promise<void>;
  listDrafts(userId: string): Promise<readonly MarketingDraft[]>;
  findDraft(userId: string, id: string): Promise<MarketingDraft | null>;
  saveDraft(
    userId: string,
    input: DraftInput,
    id?: string,
    version?: number,
  ): Promise<MarketingDraft>;
  removeDraft(userId: string, id: string): Promise<void>;
}
