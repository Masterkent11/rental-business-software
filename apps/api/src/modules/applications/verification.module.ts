import { reviewIdentityEvidence } from '@/application/verification/review-identity-evidence/review-identity-evidence.use-case.ts';
import { decideIdentityReview } from '@/application/verification/decide-identity-review/decide-identity-review.use-case.ts';
import { Inject, Logger, Module, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { cleanupVerificationEvidence } from '@/application/verification/cleanup-verification-evidence/cleanup-verification-evidence.use-case.ts';
import { IntervalJobScheduler } from '@/infrastructure/system/interval-job-scheduler.adapter.ts';
import type { RecurringJob } from '@/application/ports/providers/job-scheduler.port.ts';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator.provider.ts';
import { supabaseVerificationEvidence } from '@/infrastructure/storage/supabase-verification-evidence.adapter.ts';
import type { VerificationEvidenceStorage } from '@/application/ports/storage/verification-evidence.port.ts';
import type { IdGenerator } from '@/application/ports/providers/id-generator.port.ts';
import { IdentityModule } from '@/modules/shared/identity.module.ts';
import { VerificationController } from '@/modules/applications/controllers/verification.controller.ts';
import { postgresVerificationRepository } from '@/infrastructure/postgres/repositories/postgres-verification.repository.ts';
import { manualReviewVerificationProvider } from '@/infrastructure/verification/manual-review-verification.adapter.ts';
import { sharpVerificationImageValidator } from '@/infrastructure/verification/sharp-verification-image.adapter.ts';
import type { VerificationRepository } from '@/application/ports/repositories/verification-repository.port.ts';
import type { VerificationProvider } from '@/application/ports/providers/verification-provider.port.ts';
import type { VerificationImageValidator } from '@/application/ports/providers/verification-image.port.ts';
import { REVIEW_IDENTITY_EVIDENCE, DECIDE_IDENTITY_REVIEW, SAVE_APPLICATION_DRAFT, GET_APPLICATION_DRAFT, RESUME_VERIFICATION, RECORD_VERIFICATION_CONSENT, CAPTURE_ID_FRONT, CONFIRM_ID_DETAILS, PREPARE_FACE_CHALLENGE, CAPTURE_FACE_POSE, GET_VERIFICATION_STATUS, CANCEL_VERIFICATION, VERIFICATION_REPOSITORY, VERIFICATION_PROVIDER, VERIFICATION_IMAGES, VERIFICATION_EVIDENCE, VERIFICATION_IDS } from '@/modules/applications/verification.tokens.ts';
import { saveApplicationDraft } from '@/application/verification/save-application-draft/save-application-draft.use-case.ts';
import { getApplicationDraft } from '@/application/verification/get-application-draft/get-application-draft.use-case.ts';
import { resumeVerification } from '@/application/verification/resume-verification/resume-verification.use-case.ts';
import { recordVerificationConsent } from '@/application/verification/record-verification-consent/record-verification-consent.use-case.ts';
import { captureIdFront } from '@/application/verification/capture-id-front/capture-id-front.use-case.ts';
import { confirmIdDetails } from '@/application/verification/confirm-id-details/confirm-id-details.use-case.ts';
import { prepareFaceChallenge } from '@/application/verification/prepare-face-challenge/prepare-face-challenge.use-case.ts';
import { captureFacePose } from '@/application/verification/capture-face-pose/capture-face-pose.use-case.ts';
import { getVerificationStatus } from '@/application/verification/get-verification-status/get-verification-status.use-case.ts';
import { cancelVerification } from '@/application/verification/cancel-verification/cancel-verification.use-case.ts';
@Module({
  imports: [IdentityModule],
  controllers: [VerificationController],
  providers: [
    { provide: REVIEW_IDENTITY_EVIDENCE, inject: [VERIFICATION_REPOSITORY, VERIFICATION_EVIDENCE], useFactory: (repo: VerificationRepository, storage: VerificationEvidenceStorage) => reviewIdentityEvidence(repo, storage) },
    { provide: DECIDE_IDENTITY_REVIEW, inject: [VERIFICATION_REPOSITORY], useFactory: (repo: VerificationRepository) => decideIdentityReview(repo) },
    { provide: VERIFICATION_EVIDENCE, useFactory: supabaseVerificationEvidence },
    { provide: VERIFICATION_IDS, useFactory: () => new UuidGenerator() },
    { provide: VERIFICATION_REPOSITORY, useFactory: postgresVerificationRepository },
    { provide: VERIFICATION_PROVIDER, useFactory: manualReviewVerificationProvider },
    { provide: VERIFICATION_IMAGES, useFactory: sharpVerificationImageValidator },
    { provide: SAVE_APPLICATION_DRAFT, inject: [VERIFICATION_REPOSITORY], useFactory: (repo: VerificationRepository) => saveApplicationDraft(repo) },
    { provide: GET_APPLICATION_DRAFT, inject: [VERIFICATION_REPOSITORY], useFactory: (repo: VerificationRepository) => getApplicationDraft(repo) },
    { provide: RESUME_VERIFICATION, inject: [VERIFICATION_REPOSITORY], useFactory: (repo: VerificationRepository) => resumeVerification(repo) },
    { provide: RECORD_VERIFICATION_CONSENT, inject: [VERIFICATION_REPOSITORY], useFactory: (repo: VerificationRepository) => recordVerificationConsent(repo) },
    { provide: CAPTURE_ID_FRONT, inject: [VERIFICATION_REPOSITORY, VERIFICATION_IMAGES, VERIFICATION_EVIDENCE], useFactory: (repo: VerificationRepository, images: VerificationImageValidator, storage: VerificationEvidenceStorage) => captureIdFront(repo, images, storage) },
    { provide: CONFIRM_ID_DETAILS, inject: [VERIFICATION_REPOSITORY], useFactory: (repo: VerificationRepository) => confirmIdDetails(repo) },
    { provide: PREPARE_FACE_CHALLENGE, inject: [VERIFICATION_REPOSITORY, VERIFICATION_IDS], useFactory: (repo: VerificationRepository, ids: IdGenerator) => prepareFaceChallenge(repo, ids) },
    { provide: CAPTURE_FACE_POSE, inject: [VERIFICATION_REPOSITORY, VERIFICATION_IMAGES, VERIFICATION_EVIDENCE], useFactory: (repo: VerificationRepository, images: VerificationImageValidator, storage: VerificationEvidenceStorage) => captureFacePose(repo, images, storage) },
    { provide: GET_VERIFICATION_STATUS, inject: [VERIFICATION_REPOSITORY, VERIFICATION_PROVIDER], useFactory: (repo: VerificationRepository, provider: VerificationProvider) => getVerificationStatus(repo, provider) },
    { provide: CANCEL_VERIFICATION, inject: [VERIFICATION_REPOSITORY], useFactory: (repo: VerificationRepository) => cancelVerification(repo) },
  ],
})
export class VerificationModule implements OnApplicationBootstrap, OnModuleDestroy {
  private job: RecurringJob | null = null;
  constructor(@Inject(VERIFICATION_EVIDENCE) private readonly storage: VerificationEvidenceStorage) {}
  onApplicationBootstrap() {
    this.job = new IntervalJobScheduler(() => new Logger('IdentityEvidence').warn('Evidence cleanup could not complete; it will retry.')).every(60_000, cleanupVerificationEvidence(this.storage));
  }
  onModuleDestroy() { this.job?.stop(); }
}
