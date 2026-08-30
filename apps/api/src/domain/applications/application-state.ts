/**
 * Application states and document definitions.
 */

export type ApplicationState =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED';

/** Applicant-supplied evidence. The platform screens nothing (D-27). */
export type DocumentKind =
  | 'GOVERNMENT_ID'
  | 'PROOF_OF_INCOME'
  | 'EMPLOYMENT_LETTER'
  | 'BUSINESS_PERMIT'
  | 'OTHER';
