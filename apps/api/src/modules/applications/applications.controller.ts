import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { APPLICATION_REPOSITORY, DOCUMENT_STORAGE } from './application.tokens.ts';
import { RESOLVE_PRINCIPAL } from '../me/me.tokens.ts';
import {
  OrganizationForbiddenError,
  UnauthenticatedError,
  type resolvePrincipal,
} from '../../features/authenticate/resolve-principal.ts';
import type { ApplicationRepository, ApplicationDetail } from '../../application/ports/application-repository.ts';
import {
  AlreadyReservedError,
  ApplicationNotFoundError,
  ApprovalConflictError,
  DuplicateApplicationError,
  NotApplicableError,
  ReservationNotOfferedError,
} from '../../application/ports/application-repository.ts';
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  type DocumentStorage,
} from '../../application/ports/document-storage.ts';
import { InvalidTransitionError } from '../../domain/applications/application.ts';
import { hasCapability, type Principal } from '../../domain/identity/capability.ts';

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const submitBody = z.object({
  resourceId: z.guid(),
  desiredMoveIn: ISO_DATE,
  desiredTermMonths: z.number().int().min(1).max(36),
  message: z.string().max(2000).default(''),
});

const documentBody = z.object({
  kind: z.enum([
    'GOVERNMENT_ID',
    'PROOF_OF_INCOME',
    'EMPLOYMENT_LETTER',
    'BUSINESS_PERMIT',
    'OTHER',
  ]),
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  storagePath: z.string().min(1).optional(),
});

const decisionBody = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'UNDER_REVIEW']),
  reason: z.string().max(1000).optional(),
});

@Controller()
export class ApplicationsController {
  constructor(
    @Inject(APPLICATION_REPOSITORY)
    private readonly applications: ApplicationRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post('applications')
  async submit(@Body() body: unknown, @Headers('authorization') auth?: string) {
    const parsed = submitBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const principal = await this.principal(auth, null);

    try {
      const application = await this.applications.submit({
        ...parsed.data,
        applicantId: principal.userId,
      });
      return { id: application.id, state: application.state };
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Get('me/applications')
  async mine(@Headers('authorization') auth?: string) {
    const principal = await this.principal(auth, null);
    const applications = await this.applications.forApplicant(principal.userId);
    return { applications: applications.map(toResponse) };
  }

  @Get('me/applications/:id')
  async mineById(@Param('id') id: string, @Headers('authorization') auth?: string) {
    if (!z.guid().safeParse(id).success) {
      throw new NotFoundException('No such application');
    }

    const principal = await this.principal(auth, null);
    const application = await this.applications.forApplicantById(principal.userId, id);
    if (!application) throw new NotFoundException('No such application');

    // Read URLs are minted per request and expire in minutes, so a screenshot
    // of the response is not a lasting key to somebody's ID.
    const documents = await Promise.all(
      application.documents.map(async (doc) => ({
        id: doc.id,
        kind: doc.kind,
        fileName: doc.fileName,
        sizeBytes: doc.sizeBytes,
        url: await this.storage.createReadUrl(doc.storagePath).catch(() => null),
      })),
    );

    return { ...toResponse(application), documents };
  }

  @Post('applications/:id/withdraw')
  async withdraw(@Param('id') id: string, @Headers('authorization') auth?: string) {
    if (!z.guid().safeParse(id).success) {
      throw new NotFoundException('No such application');
    }

    const principal = await this.principal(auth, null);
    try {
      const application = await this.applications.withdraw(principal.userId, id);
      return { id: application.id, state: application.state };
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Post('applications/:id/documents')
  async attach(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    if (!z.guid().safeParse(id).success) {
      throw new NotFoundException('No such application');
    }

    const parsed = documentBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }
    if (!ALLOWED_DOCUMENT_TYPES.has(parsed.data.contentType)) {
      throw new BadRequestException('Send a photo or a PDF');
    }
    if (parsed.data.sizeBytes > MAX_DOCUMENT_BYTES) {
      throw new BadRequestException('That file is larger than 10 MB');
    }

    const principal = await this.principal(auth, null);
    const application = await this.applications.forApplicantById(principal.userId, id);
    if (!application) throw new NotFoundException('No such application');

    try {
      // Two steps: hand out an upload ticket, then record the object against
      // the application once the client says it landed.
      if (!parsed.data.storagePath) {
        const ticket = await this.storage.createUploadTicket({
          organizationId: application.organizationId,
          applicationId: id,
          fileName: parsed.data.fileName,
        });
        return { upload: ticket };
      }

      const document = await this.applications.attachDocument({
        applicantId: principal.userId,
        applicationId: id,
        kind: parsed.data.kind,
        storagePath: parsed.data.storagePath,
        fileName: parsed.data.fileName,
        contentType: parsed.data.contentType,
        sizeBytes: parsed.data.sizeBytes,
      });

      return { id: document.id, kind: document.kind, fileName: document.fileName };
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Post('applications/:id/reservation')
  async reserve(@Param('id') id: string, @Headers('authorization') auth?: string) {
    if (!z.guid().safeParse(id).success) {
      throw new NotFoundException('No such application');
    }

    const principal = await this.principal(auth, null);

    try {
      // A short window to pay, then seven days once paid. Same shape as a
      // booking hold: inventory is not held for an intention, only for a
      // payment in progress.
      const reservation = await this.applications.reserve({
        applicantId: principal.userId,
        applicationId: id,
        holdMinutes: 60,
      });

      return {
        reservationId: reservation.id,
        occupancyId: reservation.occupancyId,
        feeCentavos: reservation.feeCentavos,
        state: reservation.state,
      };
    } catch (error) {
      throw this.translate(error);
    }
  }

  // -------------------------------------------------------------------------
  // Owner side
  // -------------------------------------------------------------------------

  @Get('organizations/:organizationId/applications')
  async forOwner(
    @Param('organizationId') organizationId: string,
    @Headers('authorization') auth?: string,
  ) {
    if (!z.guid().safeParse(organizationId).success) {
      throw new BadRequestException('Not an organization id');
    }

    const principal = await this.principal(auth, organizationId);
    this.assertMayDecide(principal, organizationId);

    const applications = await this.applications.forOrganization(organizationId);
    return { applications: applications.map(toResponse) };
  }

  @Post('organizations/:organizationId/applications/:id/decision')
  async decide(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    if (
      !z.guid().safeParse(organizationId).success ||
      !z.guid().safeParse(id).success
    ) {
      throw new BadRequestException('Not an id');
    }

    const parsed = decisionBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }

    const principal = await this.principal(auth, organizationId);
    this.assertMayDecide(principal, organizationId);

    try {
      const { decideApplication } = await import(
        '../../features/apply-to-rent/apply-to-rent.ts'
      );
      const application = await decideApplication(this.applications)({
        organizationId,
        applicationId: id,
        deciderId: principal.userId,
        next: parsed.data.decision,
        ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
      });

      return {
        id: application.id,
        state: application.state,
        decisionReason: application.decisionReason,
      };
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Only an owner or staff member of *this* organization may decide.
   *
   * Membership is already verified by `resolve`; this checks the capability on
   * top, because being a member is not the same as being allowed to accept a
   * tenant.
   */
  private assertMayDecide(principal: Principal, organizationId: string): void {
    const allowed =
      hasCapability(principal, 'OWNER', organizationId) ||
      hasCapability(principal, 'STAFF', organizationId);

    if (!allowed) {
      throw new ForbiddenException('You may not decide applications here');
    }
  }

  private async principal(
    authorization: string | undefined,
    organizationId: string | null,
  ): Promise<Principal> {
    try {
      return await this.resolve({ authorization, organizationId });
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        throw new UnauthorizedException(error.message);
      }
      if (error instanceof OrganizationForbiddenError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  private translate(error: unknown): Error {
    if (
      error instanceof DuplicateApplicationError ||
      error instanceof AlreadyReservedError ||
      error instanceof ReservationNotOfferedError
    ) {
      return new BadRequestException(error.message);
    }
    if (error instanceof NotApplicableError) {
      return new BadRequestException(error.message);
    }
    if (error instanceof ApplicationNotFoundError) {
      return new NotFoundException(error.message);
    }
    if (error instanceof ApprovalConflictError) {
      // The owner is told at decision time, with the conflict named.
      return new ConflictException(error.message);
    }
    if (error instanceof InvalidTransitionError) {
      return new BadRequestException(error.message);
    }
    return error as Error;
  }
}

const toResponse = (application: ApplicationDetail) => ({
  id: application.id,
  reference: application.reference,
  state: application.state,
  listingTitle: application.listingTitle,
  photo: application.photo,
  moveInCostCentavos: application.moveInCostCentavos,
  propertyName: application.propertyName,
  areaLabel: application.areaLabel,
  cityLabel: application.cityLabel,
  monthlyRentCentavos: application.monthlyRentCentavos,
  desiredMoveIn: application.desiredMoveIn,
  desiredTermMonths: application.desiredTermMonths,
  message: application.message,
  decisionReason: application.decisionReason,
  decidedAt: application.decidedAt?.toISOString() ?? null,
  createdAt: application.createdAt.toISOString(),
  holdExpiresAt: application.holdExpiresAt?.toISOString() ?? null,
  documentCount: application.documents.length,
  documentNames: application.documents.map((doc) => doc.fileName),
  reservation: application.reservation
    ? {
        state: application.reservation.state,
        feeCentavos: application.reservation.feeCentavos,
        expiresAt: application.reservation.expiresAt?.toISOString() ?? null,
      }
    : null,
});
