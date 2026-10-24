import type {
  Application,
  ApplicationState,
  DocumentKind,
  FeeOutcome,
  Reservation,
} from '@/domain/applications/application.ts';
import type { Centavos } from '@/domain/shared/money.ts';

export type { Application, ApplicationState, DocumentKind, FeeOutcome, Reservation };

export class ApplicationNotFoundError extends Error {}
export class NotApplicableError extends Error {}
export class DuplicateApplicationError extends Error {}
export class ReservationNotOfferedError extends Error {}

/**
 * Raised when approving would double-book the resource.
 */
export class ApprovalConflictError extends Error {}
export class AlreadyReservedError extends Error {}

export interface ApplicationDocument {
  readonly id: string;
  readonly kind: DocumentKind;
  readonly fileName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly storagePath: string;
  readonly uploadedAt: Date;
}

export interface ApplicationDetail extends Application {
  readonly tenancy?: {
    readonly id: string;
    readonly kind: string;
    readonly state: string;
    readonly startsOn: string | null;
    readonly endsOn: string | null;
    readonly confirmedAt: string | null;
  } | null;
  readonly reference: string;
  readonly listingTitle: string;
  readonly photo: string | null;
  readonly moveInCostCentavos: Centavos | null;
  readonly holdExpiresAt: Date | null;
  readonly propertyName: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly monthlyRentCentavos: Centavos;
  readonly documents: readonly ApplicationDocument[];
  readonly reservation: Reservation | null;
}

export interface ApplicationRepository {
  submit(input: {
    draftId?: string;
    resourceId: string;
    applicantId: string;
    desiredMoveIn: string;
    desiredTermMonths: number;
    message: string;
  }): Promise<Application>;

  forApplicant(applicantId: string): Promise<readonly ApplicationDetail[]>;

  forApplicantById(
    applicantId: string,
    applicationId: string,
  ): Promise<ApplicationDetail | null>;

  withdraw(applicantId: string, applicationId: string): Promise<Application>;

  attachDocument(input: {
    applicantId: string;
    applicationId: string;
    kind: DocumentKind;
    storagePath: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<ApplicationDocument>;

  reserve(input: {
    applicantId: string;
    applicationId: string;
    holdMinutes: number;
  }): Promise<Reservation>;

  resolveReservation(input: {
    applicationId: string;
    outcome: FeeOutcome;
  }): Promise<void>;

  forOrganization(organizationId: string): Promise<readonly ApplicationDetail[]>;

  decide(input: {
    organizationId: string;
    applicationId: string;
    deciderId: string;
    next: ApplicationState & ('APPROVED' | 'REJECTED' | 'UNDER_REVIEW');
    reason: string | null;
  }): Promise<Application>;
}
