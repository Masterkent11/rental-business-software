import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  Post,
} from '@nestjs/common';
import { SUBMIT_APPLICATION } from '@/modules/applications/application.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { submitApplication } from '@/application/applications/submit-application/submit-application.use-case.ts';
import { submitApplicationSchema } from '@/modules/applications/dto/submit-application.dto.ts';

@Controller('applications')
export class SubmitApplicationController {
  constructor(
    @Inject(SUBMIT_APPLICATION)
    private readonly submitUseCase: ReturnType<typeof submitApplication>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post()
  async submit(@Body() body: unknown, @Headers('authorization') auth?: string) {
    const parsed = submitApplicationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const principal = await this.resolve({ authorization: auth, organizationId: null });
    const application = await this.submitUseCase({
      ...parsed.data,
      applicantId: principal.userId,
    });
    return { id: application.id, state: application.state };
  }
}
