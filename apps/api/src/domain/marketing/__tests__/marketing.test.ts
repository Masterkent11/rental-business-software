import { describe, expect, it } from "vitest";
import {
  validateDraft,
  MarketingInvalidError,
} from "@/domain/marketing/marketing.ts";
import {
  marketingDraftSchema,
  marketingDraftUpdateSchema,
  marketingUploadSchema,
} from "@/modules/marketing/dto/marketing.dto.ts";
const input = {
  title: " My draft ",
  caption: "Hello",
  listingId: null,
  sourcePhotos: [],
  mediaIds: [],
  state: "DRAFT" as const,
};
describe("marketing lifecycle and transport boundaries", () => {
  it("keeps internal readiness separate from publishing", () => {
    expect(validateDraft(input).title).toBe("My draft");
    expect(
      marketingDraftSchema.safeParse({ ...input, state: "PUBLISHED" }).success,
    ).toBe(false);
    expect(() =>
      validateDraft({ ...input, state: "READY_FOR_REVIEW" }),
    ).toThrow(MarketingInvalidError);
  });
  it("rejects caller supplied identity and stale edit without a version", () => {
    expect(
      marketingDraftSchema.safeParse({ ...input, userId: "spoofed" }).success,
    ).toBe(false);
    expect(marketingDraftUpdateSchema.safeParse(input).success).toBe(false);
  });
  it("rejects arbitrary property photos and duplicate selection", () => {
    expect(() =>
      validateDraft({ ...input, sourcePhotos: ["https://example.test/x"] }),
    ).toThrow(MarketingInvalidError);
    expect(() => validateDraft({ ...input, mediaIds: ["a", "a"] })).toThrow(
      MarketingInvalidError,
    );
  });
  it("refuses unsupported upload types and credentials in the contract", () => {
    expect(
      marketingUploadSchema.safeParse({
        fileName: "x.svg",
        contentType: "image/svg+xml",
        data: "abc",
        token: "secret",
      }).success,
    ).toBe(false);
  });
});
