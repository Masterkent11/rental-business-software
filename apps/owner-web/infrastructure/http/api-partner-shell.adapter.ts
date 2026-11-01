import { z } from "zod";
import type { PartnerShellPort } from "../../application/ports/partner-shell.port";
import type { PartnerScope } from "../../domain/workspace/workspace";
import { HttpClient } from "./http-client";
const branding = z.object({
  logo: z
    .string()
    .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/)
    .max(174788)
    .nullable(),
  canEdit: z.boolean(),
});
const results = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        kind: z.enum(["PROPERTY", "INQUIRY", "CLIENT", "TASK"]),
        title: z.string(),
        subtitle: z.string(),
      }),
    )
    .max(12),
});
const options = (scope: PartnerScope) =>
  scope.kind === "OWNER" ? { organizationId: scope.organizationId } : {};
export class ApiPartnerShellAdapter implements PartnerShellPort {
  constructor(private readonly http: HttpClient) {}
  async search(scope: PartnerScope, query: string, signal: AbortSignal) {
    return results.parse(
      await this.http.request(
        "/partner/search?q=" + encodeURIComponent(query),
        { ...options(scope), signal },
      ),
    ).items;
  }
  async branding(scope: PartnerScope, signal?: AbortSignal) {
    return branding.parse(
      await this.http.request("/partner/branding", {
        ...options(scope),
        signal,
      }),
    );
  }
  async saveLogo(
    scope: PartnerScope,
    input: { data: string; contentType: string } | null,
  ) {
    return branding.parse(
      await this.http.request("/partner/branding", {
        ...options(scope),
        method: input ? "PUT" : "DELETE",
        ...(input ? { body: input } : {}),
      }),
    );
  }
}
