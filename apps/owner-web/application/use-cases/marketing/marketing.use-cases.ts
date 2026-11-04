import type { MarketingPort } from "../../ports/marketing.port";
import type { FileReaderPort } from "../../ports/file-reader.port";
import {
  validateMarketingFile,
  type MarketingDraftInput,
} from "../../../domain/marketing/marketing";
export class MarketingUseCases {
  constructor(
    private readonly port: MarketingPort,
    private readonly reader: FileReaderPort,
  ) {}
  load() {
    return this.port.load();
  }
  save(input: MarketingDraftInput, id?: string, version?: number) {
    if (
      !input.title.trim() ||
      input.title.length > 120 ||
      input.caption.length > 2200
    )
      throw new Error(
        "Add a title up to 120 characters and a caption up to 2200 characters.",
      );
    return this.port.save(input, id, version);
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
