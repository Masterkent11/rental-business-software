import type { MarketingPort } from "../../ports/marketing.port";
import type { FileReaderPort } from "../../ports/file-reader.port";
import {
  marketingDraftTitle,
  validateMarketingFile,
  type MarketingDraftInput,
} from "../../../domain/marketing/marketing";
export class MarketingUseCases {
  constructor(
    private readonly port: MarketingPort,
    private readonly reader: FileReaderPort,
  ) {}
  facebookChannel() {
    return this.port.facebookChannel();
  }
  startFacebook() {
    return this.port.startFacebook();
  }
  completeFacebook(state: string, code: string | null) {
    return this.port.completeFacebook(state, code);
  }
  selectFacebook(selectionId: string, pageId: string) {
    return this.port.selectFacebook(selectionId, pageId);
  }
  disconnectFacebook() {
    return this.port.disconnectFacebook();
  }
  load() {
    return this.port.load();
  }
  save(input: MarketingDraftInput, id?: string, version?: number) {
    if (input.title.length > 120 || input.caption.length > 2200)
      throw new Error(
        "Use up to 120 characters for the title and 2200 for the caption.",
      );
    return this.port.save(
      { ...input, title: marketingDraftTitle(input) },
      id,
      version,
    );
  }
  removeDraft(id: string) {
    return this.port.removeDraft(id);
  }
  duplicate(id: string) {
    return this.port.duplicate(id);
  }
  async upload(file: File) {
    validateMarketingFile(file);
    return this.port.upload({
      fileName: file.name,
      contentType: file.type,
      data: await this.reader.readBase64(file),
    });
  }
  removeMedia(id: string) {
    return this.port.removeMedia(id);
  }
  readMedia(id: string) {
    return this.port.readMedia(id);
  }
}
