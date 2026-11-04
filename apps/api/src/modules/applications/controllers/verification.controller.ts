import type { FastifyRequest } from 'fastify';
import type { reviewIdentityEvidence } from '@/application/verification/review-identity-evidence/review-identity-evidence.use-case.ts';
import type { decideIdentityReview } from '@/application/verification/decide-identity-review/decide-identity-review.use-case.ts';
import { BadRequestException, Body, Controller, Get, Header, Headers, Inject, Param, Post, Req } from '@nestjs/common';
import type { z } from 'zod';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import { REVIEW_IDENTITY_EVIDENCE, DECIDE_IDENTITY_REVIEW, SAVE_APPLICATION_DRAFT, GET_APPLICATION_DRAFT, RESUME_VERIFICATION, RECORD_VERIFICATION_CONSENT, CAPTURE_ID_FRONT, CONFIRM_ID_DETAILS, PREPARE_FACE_CHALLENGE, CAPTURE_FACE_POSE, GET_VERIFICATION_STATUS, CANCEL_VERIFICATION } from '@/modules/applications/verification.tokens.ts';
import { identityReviewSchema, draftSchema, identityDetailsSchema, frontCaptureSchema, faceCaptureSchema, consentSchema, resumeSchema, verificationId } from '@/modules/applications/dto/verification.dto.ts';
import { toDraftResponse, toVerificationResponse } from '@/modules/applications/mappers/verification-http.mapper.ts';
import type { saveApplicationDraft } from '@/application/verification/save-application-draft/save-application-draft.use-case.ts';
import type { getApplicationDraft } from '@/application/verification/get-application-draft/get-application-draft.use-case.ts';
import type { resumeVerification } from '@/application/verification/resume-verification/resume-verification.use-case.ts';
import type { recordVerificationConsent } from '@/application/verification/record-verification-consent/record-verification-consent.use-case.ts';
import type { captureIdFront } from '@/application/verification/capture-id-front/capture-id-front.use-case.ts';
import type { confirmIdDetails } from '@/application/verification/confirm-id-details/confirm-id-details.use-case.ts';
import type { prepareFaceChallenge } from '@/application/verification/prepare-face-challenge/prepare-face-challenge.use-case.ts';
import type { captureFacePose } from '@/application/verification/capture-face-pose/capture-face-pose.use-case.ts';
import type { getVerificationStatus } from '@/application/verification/get-verification-status/get-verification-status.use-case.ts';
import type { cancelVerification } from '@/application/verification/cancel-verification/cancel-verification.use-case.ts';
const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new BadRequestException('Check the required verification fields.');
  return parsed.data;
};
@Controller()
export class VerificationController {
  constructor(
    @Inject(REVIEW_IDENTITY_EVIDENCE) private readonly reviewIdentityEvidenceUseCase: ReturnType<typeof reviewIdentityEvidence>,
    @Inject(DECIDE_IDENTITY_REVIEW) private readonly decideIdentityReviewUseCase: ReturnType<typeof decideIdentityReview>,
    @Inject(RESOLVE_PRINCIPAL) private readonly resolveUseCase: ReturnType<typeof resolvePrincipal>,
    @Inject(SAVE_APPLICATION_DRAFT) private readonly saveApplicationDraftUseCase: ReturnType<typeof saveApplicationDraft>,
    @Inject(GET_APPLICATION_DRAFT) private readonly getApplicationDraftUseCase: ReturnType<typeof getApplicationDraft>,
    @Inject(RESUME_VERIFICATION) private readonly resumeVerificationUseCase: ReturnType<typeof resumeVerification>,
    @Inject(RECORD_VERIFICATION_CONSENT) private readonly recordVerificationConsentUseCase: ReturnType<typeof recordVerificationConsent>,
    @Inject(CAPTURE_ID_FRONT) private readonly captureIdFrontUseCase: ReturnType<typeof captureIdFront>,
    @Inject(CONFIRM_ID_DETAILS) private readonly confirmIdDetailsUseCase: ReturnType<typeof confirmIdDetails>,
    @Inject(PREPARE_FACE_CHALLENGE) private readonly prepareFaceChallengeUseCase: ReturnType<typeof prepareFaceChallenge>,
    @Inject(CAPTURE_FACE_POSE) private readonly captureFacePoseUseCase: ReturnType<typeof captureFacePose>,
    @Inject(GET_VERIFICATION_STATUS) private readonly getVerificationStatusUseCase: ReturnType<typeof getVerificationStatus>,
    @Inject(CANCEL_VERIFICATION) private readonly cancelVerificationUseCase: ReturnType<typeof cancelVerification>,
  ) {}
  @Get('admin/identity-verifications/:userId/:id/evidence')
  @Header('Cache-Control', 'no-store')
  async reviewEvidence(@Req() request: FastifyRequest, @Param('userId') userId: string, @Param('id') id: string, @Headers('authorization') auth?: string) {
    const principal = await this.resolveUseCase({ authorization: auth, organizationId: null });
    return this.reviewIdentityEvidenceUseCase(principal, parse(verificationId, userId), parse(verificationId, id), {purpose:'Identity evidence review',requestId:request.id});
  }
  @Post('admin/identity-verifications/:userId/:id/decision')
  @Header('Cache-Control', 'no-store')
  async decideReview(@Req() request: FastifyRequest, @Param('userId') userId: string, @Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const principal = await this.resolveUseCase({ authorization: auth, organizationId: null });
    return toVerificationResponse(await this.decideIdentityReviewUseCase(principal, { ...parse(identityReviewSchema, body),
      userId: parse(verificationId, userId), sessionId: parse(verificationId, id) }, {purpose:'Identity verification decision',requestId:request.id}));
  }
  private async user(auth?: string) { return (await this.resolveUseCase({ authorization: auth, organizationId: null })).userId; }
  @Get('application-drafts/resource/:resourceId')
  async draft(@Param('resourceId') resource: string, @Headers('authorization') auth?: string) {
    return { draft: toDraftResponse(await this.getApplicationDraftUseCase(await this.user(auth), parse(verificationId, resource))) };
  }
  @Post('application-drafts')
  async saveDraft(@Body() body: unknown, @Headers('authorization') auth?: string) {
    return toDraftResponse(await this.saveApplicationDraftUseCase(await this.user(auth), parse(draftSchema, body)));
  }
  @Header('Cache-Control', 'no-store')
  @Post('identity-verifications')
  async resume(@Body() body: unknown, @Headers('authorization') auth?: string) {
    return toVerificationResponse(await this.resumeVerificationUseCase(await this.user(auth), parse(resumeSchema, body).draftId));
  }
  @Header('Cache-Control', 'no-store')
  @Get('identity-verifications/:id')
  async status(@Param('id') id: string, @Headers('authorization') auth?: string) {
    return toVerificationResponse(await this.getVerificationStatusUseCase(await this.user(auth), parse(verificationId, id)));
  }
  @Header('Cache-Control', 'no-store')
  @Post('identity-verifications/:id/consent')
  async consent(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    return toVerificationResponse(await this.recordVerificationConsentUseCase(await this.user(auth), parse(verificationId, id), parse(consentSchema, body).version));
  }
  @Header('Cache-Control', 'no-store')
  @Post('identity-verifications/:id/front')
  async front(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const userId = await this.user(auth);
    const dto = parse(frontCaptureSchema, body);
    return toVerificationResponse(await this.captureIdFrontUseCase(userId, parse(verificationId, id), dto.captureId, Buffer.from(dto.imageBase64, 'base64'), dto.extracted, dto.ocrConfidence));
  }
  @Header('Cache-Control', 'no-store')
  @Post('identity-verifications/:id/details')
  async details(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    return toVerificationResponse(await this.confirmIdDetailsUseCase(await this.user(auth), parse(verificationId, id), parse(identityDetailsSchema, body)));
  }
  @Header('Cache-Control', 'no-store')
  @Post('identity-verifications/:id/challenge')
  async challenge(@Param('id') id: string, @Headers('authorization') auth?: string) {
    return toVerificationResponse(await this.prepareFaceChallengeUseCase(await this.user(auth), parse(verificationId, id)));
  }
  @Header('Cache-Control', 'no-store')
  @Post('identity-verifications/:id/face')
  async face(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') auth?: string) {
    const userId = await this.user(auth);
    const dto = parse(faceCaptureSchema, body);
    return toVerificationResponse(await this.captureFacePoseUseCase(userId, parse(verificationId, id), dto.challengeId, dto.instruction, dto.evidenceId, Buffer.from(dto.imageBase64, 'base64')));
  }
  @Header('Cache-Control', 'no-store')
  @Post('identity-verifications/:id/cancel')
  async cancel(@Param('id') id: string, @Headers('authorization') auth?: string) {
    return toVerificationResponse(await this.cancelVerificationUseCase(await this.user(auth), parse(verificationId, id)));
  }
}
