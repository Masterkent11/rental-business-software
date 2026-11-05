import type {
  FacebookAuthorizationOutcome,
  FacebookChannel,
  MarketingSnapshot,
  MarketingDraft,
  MarketingDraftInput,
  MarketingMedia,
} from "../../domain/marketing/marketing";
export interface MarketingPort {
  facebookChannel(): Promise<FacebookChannel>;
  startFacebook(): Promise<string>;
  completeFacebook(
    state: string,
    code: string | null,
  ): Promise<FacebookAuthorizationOutcome>;
  selectFacebook(selectionId: string, pageId: string): Promise<FacebookChannel>;
  disconnectFacebook(): Promise<void>;
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
