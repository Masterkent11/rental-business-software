import type {
  MarketingSnapshot,
  MarketingDraft,
  MarketingDraftInput,
  MarketingMedia,
} from "../../domain/marketing/marketing";
export interface MarketingPort {
  load(): Promise<MarketingSnapshot>;
  save(
    input: MarketingDraftInput,
    id?: string,
    version?: number,
  ): Promise<MarketingDraft>;
  removeDraft(id: string): Promise<void>;
  duplicate(id: string): Promise<MarketingDraft>;
  upload(input: {
    fileName: string;
    contentType: string;
    data: string;
  }): Promise<MarketingMedia>;
  removeMedia(id: string): Promise<void>;
  readMedia(id: string): Promise<{ url: string; expiresInSeconds: number }>;
}
