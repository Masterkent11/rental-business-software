export type VerificationStatus = 'CONSENT_REQUIRED' | 'FRONT_READY' | 'OCR_PROCESSING' |
  'OCR_REVIEW' | 'DETAILS_CONFIRMED' | 'CHALLENGE_ACTIVE' | 'VERIFYING' |
  'VERIFIED' | 'MANUAL_REVIEW' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
export type FaceInstruction = 'ALIGN' | 'RIGHT' | 'LEFT' | 'UP';

export class VerificationNotFoundError extends Error {}
export class VerificationConflictError extends Error {}
export class VerificationInputError extends Error {}
export class VerificationRateLimitError extends Error {}
export class VerificationRequiredError extends Error {}
export class VerificationUnavailableError extends Error {}

export interface IdentityDetails {
  readonly fullName: string;
  readonly dateOfBirth: string;
  readonly documentType: string;
  readonly documentNumber: string;
}

export interface ApplicationDraftInput {
  readonly resourceId: string;
  readonly desiredMoveIn: string;
  readonly desiredTermMonths: number;
  readonly occupants: number;
  readonly message: string;
}

export interface ApplicationDraft extends ApplicationDraftInput {
  readonly id: string;
  readonly userId: string;
  readonly applicationId: string | null;
}

export interface VerificationSession {
  readonly id: string;
  readonly userId: string;
  readonly draftId: string;
  readonly version: number;
  readonly status: VerificationStatus;
  readonly expiresAt: string;
  readonly consentAt: string | null;
  readonly consentVersion: string | null;
  readonly captureId: string | null;
  readonly frontPath: string | null;
  readonly review?: { readonly reviewerId: string; readonly decidedAt: string; readonly approved: boolean; readonly validUntil: string | null } | null;
  readonly evidence: readonly { readonly id: string; readonly instruction: FaceInstruction; readonly path: string }[];
  readonly extracted: IdentityDetails | null;
  readonly confidence: Partial<Record<keyof IdentityDetails, number>> | null;
  readonly reviewed: IdentityDetails | null;
  readonly challenge: { readonly id: string; readonly expiresAt: string; readonly instruction: FaceInstruction } | null;
  readonly failure: { readonly code: string; readonly message: string; readonly retryable: boolean } | null;
}

export const VERIFICATION_CONSENT_VERSION = 'identity-v1';
export const VERIFICATION_SESSION_MINUTES = 30;
export const FACE_SEQUENCE: readonly FaceInstruction[] = ['ALIGN', 'RIGHT', 'LEFT', 'UP'];

export function assertVerificationState(session: VerificationSession, allowed: readonly VerificationStatus[], now: Date): void {
  if (new Date(session.expiresAt) <= now || session.status === 'EXPIRED') {
    throw new VerificationConflictError('This verification has expired. Start again.');
  }
  if (!allowed.includes(session.status)) {
    throw new VerificationConflictError('Verification changed. Refresh before continuing.');
  }
}

export function validateIdentityDetails(details: IdentityDetails, now: Date): IdentityDetails {
  const value = {
    fullName: details.fullName.trim(), dateOfBirth: details.dateOfBirth,
    documentType: details.documentType.trim(), documentNumber: details.documentNumber.trim(),
  };
  const birth = new Date(`${value.dateOfBirth}T00:00:00Z`);
  if (!value.fullName || value.fullName.length > 200 || !value.documentType || value.documentType.length > 100 ||
      !value.documentNumber || value.documentNumber.length > 100 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.dateOfBirth) || !Number.isFinite(birth.getTime()) ||
      birth.toISOString().slice(0, 10) !== value.dateOfBirth || birth > now || birth.getUTCFullYear() < 1900) {
    throw new VerificationInputError('Enter your full name, valid birth date, ID type and ID number.');
  }
  return value;
}

export function validateApplicationDraft(input: ApplicationDraftInput, now: Date): void {
  const date = new Date(`${input.desiredMoveIn}T00:00:00Z`);
  const today = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.desiredMoveIn) || !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== input.desiredMoveIn || date < today ||
      !Number.isInteger(input.occupants) || input.occupants < 1 || input.occupants > 50 ||
      !Number.isInteger(input.desiredTermMonths) || input.desiredTermMonths < 1 || input.desiredTermMonths > 60 ||
      input.message.length > 2000) {
    throw new VerificationInputError('Check your move-in date, occupants and rental term.');
  }
}

export interface RentalApplicationPolicy {
  readonly kind: string | null;
  readonly intent: string;
  readonly state: string;
  readonly rentalMode: string;
  readonly maxOccupants: number;
  readonly minLeaseMonths: number | null;
  readonly maxLeaseMonths: number | null;
  readonly availableFrom: string | null;
}

export function assertApplicationPolicy(input: ApplicationDraftInput, policy: RentalApplicationPolicy | null): void {
  if (!policy || policy.intent !== 'RENT' || policy.kind !== 'LONG_TERM' || policy.state !== 'PUBLISHED' ||
    !['LONG_TERM', 'HYBRID'].includes(policy.rentalMode)) {
    throw new VerificationInputError('This place is not accepting long-term applications.');
  }
  if (input.occupants > policy.maxOccupants) throw new VerificationInputError(`This place allows up to ${policy.maxOccupants} occupants.`);
  if (policy.minLeaseMonths !== null && input.desiredTermMonths < policy.minLeaseMonths) {
    throw new VerificationInputError(`Choose a rental term of at least ${policy.minLeaseMonths} months.`);
  }
  if (policy.maxLeaseMonths !== null && input.desiredTermMonths > policy.maxLeaseMonths) {
    throw new VerificationInputError(`Choose a rental term of at most ${policy.maxLeaseMonths} months.`);
  }
  if (policy.availableFrom && input.desiredMoveIn < policy.availableFrom) {
    throw new VerificationInputError('Choose a move-in date on or after this place becomes available.');
  }
}
