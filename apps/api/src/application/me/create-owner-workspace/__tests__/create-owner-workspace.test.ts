import { describe, expect, it, vi } from "vitest";
import { createOwnerWorkspace } from "@/application/me/create-owner-workspace/create-owner-workspace.use-case.ts";
import { CreateOwnerWorkspaceController } from "@/modules/me/controllers/create-owner-workspace.controller.ts";
import { createOwnerWorkspaceSchema } from "@/modules/me/dto/create-owner-workspace.dto.ts";

const principal = {
  userId: "11111111-2222-4333-8444-555555555555",
  displayName: "Ana",
  capabilities: [],
  organizationId: null,
};

describe("owner onboarding boundaries", () => {
  it("creates for the verified principal and normalizes the name", async () => {
    const save = vi.fn().mockResolvedValue({ organizationId: "new" });
    await createOwnerWorkspace({ createOwnerWorkspace: save })({
      principal,
      workspaceName: "  Ana   Homes  ",
    });
    expect(save).toHaveBeenCalledWith({
      userId: principal.userId,
      workspaceName: "Ana Homes",
    });
  });
  it("refuses unauthenticated and invalid requests before writing", async () => {
    const save = vi.fn();
    const execute = createOwnerWorkspace({ createOwnerWorkspace: save });
    await expect(
      execute({
        principal: { ...principal, userId: "" },
        workspaceName: "Homes",
      }),
    ).rejects.toThrow("sign in");
    await expect(execute({ principal, workspaceName: " " })).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
  });
  it("rejects client-supplied existing organization ids, roles and user ids", () => {
    expect(
      createOwnerWorkspaceSchema.safeParse({
        workspaceName: "Homes",
        organizationId: "other",
      }).success,
    ).toBe(false);
    expect(
      createOwnerWorkspaceSchema.safeParse({
        workspaceName: "Homes",
        userId: "other",
        role: "PLATFORM_ADMIN",
      }).success,
    ).toBe(false);
  });
  it("the controller resolves identity and invokes only the use case", async () => {
    const resolve = vi.fn().mockResolvedValue(principal);
    const create = vi.fn().mockResolvedValue({ organizationId: "new" });
    const controller = new CreateOwnerWorkspaceController(resolve, create);
    expect(
      await controller.execute({ workspaceName: "Homes" }, "Bearer valid"),
    ).toEqual({ organizationId: "new" });
    expect(resolve).toHaveBeenCalledWith({
      authorization: "Bearer valid",
      organizationId: null,
    });
    expect(create).toHaveBeenCalledWith({ principal, workspaceName: "Homes" });
  });
});
