import { describe, it, expect, vi } from "vitest";
import { searchPartner } from "@/application/partners/search-partner/search-partner.use-case.ts";
import { savePartnerBranding } from "@/application/partners/save-partner-branding/save-partner-branding.use-case.ts";
import { normalizePartnerQuery } from "@/domain/partners/partner-shell.ts";
import type { Principal } from "@/domain/identity/identity.ts";
import type { PartnerShellRepository } from "@/application/ports/repositories/partner-shell-repository.port.ts";
const owner: Principal = {
  userId: "owner",
  displayName: "Owner",
  organizationId: "own",
  capabilities: [{ capability: "OWNER", organizationId: "own" }],
};
const repo = (): PartnerShellRepository => ({
  search: vi.fn(async () => []),
  readLogo: vi.fn(async () => null),
  saveLogo: vi.fn(async () => {}),
});
describe("Partner shell application boundaries", () => {
  it("normalizes accents, whitespace and case and bounds search input", () => {
    expect(normalizePartnerQuery("  CÉBU   Villa ")).toBe("cebu villa");
    expect(() => normalizePartnerQuery("x".repeat(81))).toThrow();
    expect(() => normalizePartnerQuery("a b c d e f g")).toThrow();
  });
  it("short input never queries the repository, customer and forged owner role denied", async () => {
    const repository = repo(),
      search = searchPartner(repository);
    await search(owner, "a");
    expect(repository.search).not.toHaveBeenCalled();
    await expect(
      search({ ...owner, organizationId: "other" }, "villa"),
    ).rejects.toThrow();
    await expect(
      search({ ...owner, organizationId: null, capabilities: [] }, "villa"),
    ).rejects.toThrow();
  });
  it("passes verified server principal context and normalized query only", async () => {
    const repository = repo();
    await searchPartner(repository)(owner, "  VILLA ");
    expect(repository.search).toHaveBeenCalledWith(
      { kind: "OWNER", userId: "owner", organizationId: "own" },
      "villa",
    );
  });
  it("staff can search but cannot process or save a logo", async () => {
    const staff = {
        ...owner,
        capabilities: [{ capability: "STAFF" as const, organizationId: "own" }],
      },
      repository = repo(),
      processor = { prepare: vi.fn(async () => "normalized") };
    await searchPartner(repository)(staff, "villa");
    await expect(
      savePartnerBranding(repository, processor)(staff, {
        data: "anything",
        contentType: "image/png",
      }),
    ).rejects.toThrow();
    expect(processor.prepare).not.toHaveBeenCalled();
    expect(repository.saveLogo).not.toHaveBeenCalled();
  });
  it("persists normalized image only and supports explicit deletion", async () => {
    const repository = repo(),
      save = savePartnerBranding(repository, {
        prepare: async () => "normalized",
      });
    expect(
      await save(owner, { data: "raw", contentType: "image/png" }),
    ).toEqual({ logo: "normalized", canEdit: true });
    expect(repository.saveLogo).toHaveBeenLastCalledWith(
      { kind: "OWNER", userId: "owner", organizationId: "own" },
      "normalized",
    );
    await save(owner, null);
    expect(repository.saveLogo).toHaveBeenLastCalledWith(
      { kind: "OWNER", userId: "owner", organizationId: "own" },
      null,
    );
  });
});
