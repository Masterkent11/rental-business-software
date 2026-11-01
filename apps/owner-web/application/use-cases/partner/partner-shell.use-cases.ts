import type { PartnerShellPort } from "../../ports/partner-shell.port";
import type { FileReaderPort } from "../../ports/file-reader.port";
import { scopeOf, type Workspace } from "../../../domain/workspace/workspace";
import { partnerResultHref } from "../../../domain/workspace/partner-shell";
export class PartnerShellUseCases {
  constructor(
    private readonly port: PartnerShellPort,
    private readonly files: FileReaderPort,
  ) {}
  async search(workspace: Workspace, query: string, signal: AbortSignal) {
    const results = await this.port.search(scopeOf(workspace), query, signal);
    return results
      .filter((item) => item.kind !== "PAGE")
      .map((item) => ({
        ...item,
        href: partnerResultHref(
          workspace,
          item.kind as "PROPERTY" | "INQUIRY" | "CLIENT" | "TASK",
          item.id,
        ),
      }));
  }
  branding(workspace: Workspace, signal?: AbortSignal) {
    return this.port.branding(scopeOf(workspace), signal);
  }
  async upload(workspace: Workspace, file: File) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024 ||
      !file.size
    )
      throw new Error("Choose a JPEG, PNG or WebP image up to 2 MiB.");
    return this.port.saveLogo(scopeOf(workspace), {
      data: await this.files.readBase64(file),
      contentType: file.type,
    });
  }
  remove(workspace: Workspace) {
    return this.port.saveLogo(scopeOf(workspace), null);
  }
}
