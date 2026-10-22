import { Controller, Headers, HttpCode, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { ISSUE_REFERRAL_CODE } from '@/modules/assignment/assignment.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { issueReferralCode } from '@/application/assignment/issue-referral-code/issue-referral-code.use-case.ts';

@Controller('agent/listings/:listingId/referral-code')
export class AgentReferralsController {
  constructor(
    @Inject(ISSUE_REFERRAL_CODE) private readonly issue: ReturnType<typeof issueReferralCode>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post()
  @HttpCode(200)
  async create(@Param('listingId') listingId: string, @Headers('authorization') auth?: string) {
    if (!z.guid().safeParse(listingId).success) throw new NotFoundException('No such listing');
    const principal = await this.resolve({ authorization: auth, organizationId: null });
    return this.issue({ principal, listingId });
  }
}
