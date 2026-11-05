import { z } from "zod";
import type { MarketingPort } from "../../application/ports/marketing.port";
import type { MarketingDraftInput } from "../../domain/marketing/marketing";
import { HttpClient, HttpError } from "./http-client";
const media = z.object({
  id: z.string().uuid(),
  fileName: z.string(),
  contentType: z.string(),
  bytes: z.number(),
  state: z.enum(["PENDING", "READY", "FAILED", "DELETING"]),
  createdAt: z.string(),
});
const draft = z.object({
  id: z.string().uuid(),
  title: z.string(),
  caption: z.string(),
  listingId: z.string().uuid().nullable(),
  sourcePhotos: z.array(z.string()),
  mediaIds: z.array(z.string().uuid()),
  state: z.enum(["DRAFT", "READY_FOR_REVIEW"]),
  version: z.number().int(),
  updatedAt: z.string(),
  actionRequired: z.boolean().optional(),
});
const snapshot = z.object({
  media: z.array(media),
  drafts: z.array(draft),
  properties: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      photos: z.array(z.string()),
      location: z.string().optional(),
    }),
  ),
});
const base = "/agent/marketing";
const facebookBase = base + "/channels/facebook";
const facebookPage = z.object({ id: z.string(), name: z.string() });
const facebookChannel = z.object({
  enabled: z.boolean(),
  connection: facebookPage.extend({ connectedAt: z.string() }).nullable(),
  selection: z
    .object({ id: z.string(), pages: z.array(facebookPage) })
    .nullable(),
});

export class ApiMarketingAdapter implements MarketingPort {
  constructor(private readonly http: HttpClient) {}
  async facebookChannel() {
    try {
      return facebookChannel.parse(await this.http.request(facebookBase));
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        throw new Error(
          "This API version does not support Facebook connections yet. Update the API and try again.",
        );
      }
      throw error;
    }
  }
  async startFacebook() {
    const { authorizationUrl } = z
      .object({ authorizationUrl: z.string().url() })
      .parse(
        await this.http.request(facebookBase + "/start", { method: "POST" }),
      );
    const url = new URL(authorizationUrl);
    if (url.origin !== "https://www.facebook.com")
      throw new Error("Facebook returned an invalid authorization link.");
    return url.href;
  }
  async completeFacebook(state: string, code: string | null) {
    const { outcome } = z
      .object({
        outcome: z.enum(["SELECT_PAGE", "NO_ELIGIBLE_PAGES", "CANCELLED"]),
      })
      .parse(
        await this.http.request(facebookBase + "/complete", {
          method: "POST",
          body: { state, code },
        }),
      );
    return outcome;
  }
  async selectFacebook(selectionId: string, pageId: string) {
    return facebookChannel.parse(
      await this.http.request(facebookBase + "/select", {
        method: "POST",
        body: { selectionId, pageId },
      }),
    );
  }
  async disconnectFacebook() {
    await this.http.request(facebookBase, { method: "DELETE" });
  }
  async load() {
    try {
      return snapshot.parse(await this.http.request(base));
    } catch (error) {
      if (error instanceof HttpError && error.code === "MARKETING_UNAVAILABLE")
        throw new Error(
          "Marketing Hub has not been enabled in this environment yet.",
        );
      throw error;
    }
  }
  async save(input: MarketingDraftInput, id?: string, version?: number) {
    return draft.parse(
      await this.http.request(base + "/drafts" + (id ? "/" + id : ""), {
        method: id ? "PUT" : "POST",
        body: id ? { ...input, version } : input,
      }),
    );
  }
  async removeDraft(id: string) {
    await this.http.request(base + "/drafts/" + id, { method: "DELETE" });
  }
  async duplicate(id: string) {
    return draft.parse(
      await this.http.request(base + "/drafts/" + id + "/duplicate", {
        method: "POST",
      }),
    );
  }
  async upload(input: { fileName: string; contentType: string; data: string }) {
    return media.parse(
      await this.http.request(base + "/media", { method: "POST", body: input }),
    );
  }
  async removeMedia(id: string) {
    await this.http.request(base + "/media/" + id, { method: "DELETE" });
  }
  async readMedia(id: string) {
    return z
      .object({ url: z.string().url(), expiresInSeconds: z.number() })
      .parse(await this.http.request(base + "/media/" + id + "/read"));
  }
}
