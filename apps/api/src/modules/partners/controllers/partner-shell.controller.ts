import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Put,
  Query,
  Header,
} from "@nestjs/common";
import { z } from "zod";
import { PARTNER_SHELL } from "@/modules/partners/partner-shell.tokens.ts";
import type { partnerShellActions } from "@/modules/partners/partner-shell.module.ts";
import { RESOLVE_PRINCIPAL } from "@/modules/me/me.tokens.ts";
import type { resolvePrincipal } from "@/application/identity/resolve-principal/resolve-principal.use-case.ts";
import {
  partnerSearchQuery,
  partnerLogoInput,
} from "@/modules/partners/dto/partner-shell.dto.ts";
import {
  brandingResponse,
  searchResponse,
} from "@/modules/partners/mappers/partner-shell.mapper.ts";
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BadRequestException("Invalid search or logo input.");
  return result.data;
};
@Controller("partner")
export class PartnerShellController {
  constructor(
    @Inject(PARTNER_SHELL)
    private readonly actions: ReturnType<typeof partnerShellActions>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}
  private principal(auth: string | undefined, org: string | undefined) {
    return this.resolve({
      authorization: auth,
      organizationId: org ? parse(z.guid(), org) : null,
      ...(org ? {} : { requiredCapability: "AGENT" as const }),
    });
  }
  @Get("search")
  @Header("Cache-Control", "private, no-store")
  async search(
    @Query() query: unknown,
    @Headers("authorization") auth?: string,
    @Headers("x-organization-id") org?: string,
  ) {
    const input = parse(partnerSearchQuery, query);
    return searchResponse(
      await this.actions.search(await this.principal(auth, org), input.q),
    );
  }
  @Get("branding")
  @Header("Cache-Control", "private, no-store")
  async read(
    @Headers("authorization") auth?: string,
    @Headers("x-organization-id") org?: string,
  ) {
    return brandingResponse(
      await this.actions.read(await this.principal(auth, org)),
    );
  }
  @Put("branding")
  @Header("Cache-Control", "private, no-store")
  async save(
    @Body() body: unknown,
    @Headers("authorization") auth?: string,
    @Headers("x-organization-id") org?: string,
  ) {
    const input = parse(partnerLogoInput, body);
    return brandingResponse(
      await this.actions.save(await this.principal(auth, org), input),
    );
  }
  @Delete("branding")
  @Header("Cache-Control", "private, no-store")
  async remove(
    @Headers("authorization") auth?: string,
    @Headers("x-organization-id") org?: string,
  ) {
    return brandingResponse(
      await this.actions.save(await this.principal(auth, org), null),
    );
  }
}
