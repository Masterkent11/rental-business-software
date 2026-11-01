import { describe, it, expect, vi } from "vitest";
import { authorizeAdministration } from "@/application/administration/authorize-administration/authorize-administration.use-case.ts";
import type { Principal } from "@/domain/identity/identity.ts";
const admin: Principal = {
  userId: "admin",
  displayName: "Reviewer",
  organizationId: null,
  assuranceLevel: "aal2",
  capabilities: [{ capability: "PLATFORM_ADMIN", organizationId: null }],
};
const audit = { purpose: "Review request WSP 32", requestId: "request-1" };
describe("administration boundary", () => {
  for (const [name, principal] of [
    [
      "Owner",
      {
        ...admin,
        capabilities: [{ capability: "OWNER" as const, organizationId: "A" }],
      },
    ],
    [
      "Agent",
      {
        ...admin,
        capabilities: [{ capability: "AGENT" as const, organizationId: null }],
      },
    ],
    ["admin without MFA", { ...admin, assuranceLevel: "aal1" as const }],
    ["admin in partner context", { ...admin, organizationId: "A" }],
  ] as const) {
    it(`denies ${name} and records denial`, async () => {
      const record = vi.fn();
      const permitted = vi.fn().mockResolvedValue(true);
      const authorize = authorizeAdministration({
        permitted,
        audit: record,
        monitor: async () => [],
      });
      await expect(
        authorize(principal, "PARTNER_MONITOR", audit),
      ).rejects.toThrow("MFA");
      expect(permitted).not.toHaveBeenCalled();
      expect(record).toHaveBeenCalledWith(
        "admin",
        "PARTNER_MONITOR",
        null,
        "DENIED",
        audit,
      );
    });
  }
  it("requires the exact permission and fails closed when the audit sink fails", async () => {
    const repository = {
      permitted: vi.fn().mockResolvedValue(false),
      audit: vi.fn(),
      monitor: async () => [],
    };
    await expect(
      authorizeAdministration(repository)(admin, "PARTNER_MONITOR", audit),
    ).rejects.toThrow("permission");
    repository.permitted.mockResolvedValue(true);
    repository.audit.mockRejectedValue(new Error("Audit unavailable"));
    await expect(
      authorizeAdministration(repository)(admin, "PARTNER_MONITOR", audit),
    ).rejects.toThrow("Audit unavailable");
  });
  it("accepts only scoped MFA administration with purpose and correlation", async () => {
    const repository = {
      permitted: async () => true,
      audit: vi.fn(),
      monitor: async () => [],
    };
    await expect(
      authorizeAdministration(repository)(admin, "PARTNER_MONITOR", audit),
    ).resolves.toEqual({ ...audit, assuranceLevel: "aal2" });
    await expect(
      authorizeAdministration(repository)(admin, "PARTNER_MONITOR", {
        ...audit,
        purpose: "",
      }),
    ).rejects.toThrow("purpose");
  });
});
