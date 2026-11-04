import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { z } from "zod";
import { RESOLVE_PRINCIPAL } from "@/modules/me/me.tokens.ts";
import type { resolvePrincipal } from "@/application/identity/resolve-principal/resolve-principal.use-case.ts";
import type { MarketingUseCases } from "@/application/marketing/marketing.types.ts";
import { MARKETING_USE_CASES } from "@/modules/marketing/marketing.tokens.ts";
import {
  marketingDraftSchema,
  marketingDraftUpdateSchema,
  marketingUploadSchema,
} from "@/modules/marketing/dto/marketing.dto.ts";
import {
  toMarketingHttp,
  toMarketingMediaHttp,
} from "@/modules/marketing/mappers/marketing-http.mapper.ts";
const parse = <T>(schema: z.ZodType<T>, raw: unknown): T => {
  const value = schema.safeParse(raw);
  if (!value.success)
    throw new BadRequestException(
      value.error.issues[0]?.message ?? "Invalid input.",
    );
  return value.data;
};
const guid = (value: string) => parse(z.guid(), value);
@Controller("agent/marketing")
export class AgentMarketingController {
  constructor(
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
    @Inject(MARKETING_USE_CASES) private readonly actions: MarketingUseCases,
  ) {}
  private principal(authorization: string | undefined) {
    return this.resolve({ authorization, organizationId: null, requiredCapability: 'AGENT' });
  }
  @Get() async overview(@Headers("authorization") auth?: string) {
    return toMarketingHttp(await this.actions.load(await this.principal(auth)));
  }
  @Get("drafts") async drafts(@Headers("authorization") auth?: string) {
    return {
      items: (await this.actions.load(await this.principal(auth))).drafts,
    };
  }
  @Post("drafts") async create(
    @Body() body: unknown,
    @Headers("authorization") auth?: string,
  ) {
    return this.actions.save(
      await this.principal(auth),
      parse(marketingDraftSchema, body),
    );
  }
  @Get("drafts/:id") async get(
    @Param("id") id: string,
    @Headers("authorization") auth?: string,
  ) {
    return this.actions.get(await this.principal(auth), guid(id));
  }
  @Put("drafts/:id") async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("authorization") auth?: string,
  ) {
    const input = parse(marketingDraftUpdateSchema, body);
    return this.actions.save(
      await this.principal(auth),
      input,
      guid(id),
      input.version,
    );
  }
  @Delete("drafts/:id") async remove(
    @Param("id") id: string,
    @Headers("authorization") auth?: string,
  ) {
    await this.actions.remove(await this.principal(auth), guid(id));
    return { removed: true };
  }
  @Post("drafts/:id/duplicate") async duplicate(
    @Param("id") id: string,
    @Headers("authorization") auth?: string,
  ) {
    return this.actions.duplicate(await this.principal(auth), guid(id));
  }
  @Get("media") async media(@Headers("authorization") auth?: string) {
    return {
      items: (await this.actions.load(await this.principal(auth))).media.map(
        toMarketingMediaHttp,
      ),
    };
  }
  @Post("media") async upload(
    @Body() body: unknown,
    @Headers("authorization") auth?: string,
  ) {
    return toMarketingMediaHttp(
      await this.actions.upload(
        await this.principal(auth),
        parse(marketingUploadSchema, body),
      ),
    );
  }
  @Get("media/:id/read") async read(
    @Param("id") id: string,
    @Headers("authorization") auth?: string,
  ) {
    return this.actions.readMedia(await this.principal(auth), guid(id));
  }
  @Delete("media/:id") async removeMedia(
    @Param("id") id: string,
    @Headers("authorization") auth?: string,
  ) {
    await this.actions.removeMedia(await this.principal(auth), guid(id));
    return { removed: true };
  }
}
