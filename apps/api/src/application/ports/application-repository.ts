import type {
  Application,
  ApplicationState,
  DocumentKind,
  FeeOutcome,
  Reservation,
} from '../../domain/applications/application.ts';
import type { Centavos } from '../../domain/shared/money.ts';

export class ApplicationNotFoundError extends Error {}
export class NotApplicableError extends Error {}
export class DuplicateApplicationError extends Error {}
export class ReservationNotOfferedError extends Error {}

/**
 * Raised when approving would double-book the resource.
 *
 * The owner is told at decision time with the conflict shown, rather than
 * discovering it when the tenant arrives.
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
  /** Short and human-quotable. Nobody reads a uuid down a phone line. */
  readonly reference: string;
  readonly listingTitle: string;
  readonly photo: string | null;
  /** What turns this into a lease, if approved — the number to budget for. */
  readonly moveInCostCentavos: Centavos | null;
  /** When the hold on this place lapses — a reservation's, or an approval's. */
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
    resourceId: string;
    applicantId: string;
    desiredMoveIn: string;
    desiredTermMonths: number;
    message: string;
  }): Promise<Application>;

  /** The applicant's own applications, newest first. */
  forApplicant(applicantId: string): Promise<readonly ApplicationDetail[]>;

  /** One application, visible to its applicant. */
  forApplicantById(
    applicantId: string,
    applicationId: string,
  ): Promise<ApplicationDetail | null>;

  /** Everything an organization has to decide on. */
  forOrganization(organizationId: string): Promise<readonly ApplicationDetail[]>;

  withdraw(applicantId: string, applicationId: string): Promise<Application>;

  /**
   * The owner's decision.
   *
   * Resolves the reservation fee in the same transaction: a decision that
   * leaves the money in limbo is the state customers chase support about.
   */
  decide(input: {
    organizationId: string;
    applicationId: string;
    deciderId: string;
    next: ApplicationState & ('APPROVED' | 'REJECTED' | 'UNDER_REVIEW');
    reason: string | null;
  }): Promise<Application>;

  attachDocument(input: {
    applicantId: string;
    applicationId: string;
    kind: DocumentKind;
    storagePath: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<ApplicationDocument>;

  /**
   * Reserve the place while the owner decides.
   *
   * Places a HELD occupancy for the intended tenancy — the whole point is that
   * nobody else can take it — with a short payment window first. Paying extends
   * it to seven days.
   */
  reserve(input: {
    applicantId: string;
    applicationId: string;
    holdMinutes: number;
  }): Promise<Reservation>;

  /** The fee outcome, applied to money as well as to state. */
  resolveReservation(input: {
    applicationId: string;
    outcome: FeeOutcome;
  }): Promise<void>;
}
