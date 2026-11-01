import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
} from "@nestjs/common";
import type { resolvePrincipal } from "@/application/identity/resolve-principal/resolve-principal.use-case.ts";
import type { createOwnerWorkspace } from "@/application/me/create-owner-workspace/create-owner-workspace.use-case.ts";
import {
  CREATE_OWNER_WORKSPACE,
  RESOLVE_PRINCIPAL,
} from "@/modules/me/me.tokens.ts";
import { createOwnerWorkspaceSchema } from "@/modules/me/dto/create-owner-workspace.dto.ts";
import { toOwnerWorkspaceHttp } from "@/modules/me/mappers/owner-workspace-http.mapper.ts";

@Controller("me/owner-workspace")
export class CreateOwnerWorkspaceController {
  constructor(
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
    @Inject(CREATE_OWNER_WORKSPACE)
    private readonly create: ReturnType<typeof createOwnerWorkspace>,
  ) {}

  @Post()
  @HttpCode(200)
  async execute(
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
  ) {
    const input = createOwnerWorkspaceSchema.safeParse(body);
    if (!input.success)
      throw new BadRequestException(
        "Enter a workspace name between 2 and 80 characters.",
      );
    const principal = await this.resolve({
      authorization,
      organizationId: null,
    });
    return toOwnerWorkspaceHttp(
      await this.create({ principal, workspaceName: input.data.workspaceName }),
    );
  }
}
