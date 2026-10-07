import { BadRequestException, Body, Controller, Get, Headers, Inject, Patch } from '@nestjs/common';
import { z } from 'zod';
import { GET_ME, RESOLVE_PRINCIPAL, UPDATE_MY_PROFILE } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { getMe } from '@/application/me/get-me/get-me.use-case.ts';
import type { updateMyProfile } from '@/application/me/update-my-profile/update-my-profile.use-case.ts';
import { toMeHttpResponse } from '@/modules/me/mappers/me-http.mapper.ts';

const updateProfileSchema = z.object({ displayName: z.string().max(120) });

@Controller('me')
export class GetMeController {
  constructor(
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
    @Inject(GET_ME)
    private readonly me: ReturnType<typeof getMe>,
    @Inject(UPDATE_MY_PROFILE)
    private readonly updateProfile: ReturnType<typeof updateMyProfile>,
  ) {}

  @Get()
  async getMe(
    @Headers('authorization') auth?: string,
    @Headers('x-organization-id') orgHeader?: string,
  ) {
    const principal = await this.resolve({
      authorization: auth,
      organizationId: orgHeader?.trim() || null,
    });
    return toMeHttpResponse(await this.me({ principal }));
  }

  @Patch()
  async patchMe(@Body() body: unknown, @Headers('authorization') auth?: string) {
    const parsed = updateProfileSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException('Send a displayName');
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    await this.updateProfile({ principal, displayName: parsed.data.displayName });
    return toMeHttpResponse(await this.me({ principal }));
  }
}
