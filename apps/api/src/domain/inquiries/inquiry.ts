export * from './inquiry-rules.ts';
export * from './inquiry-errors.ts';

export type InquiryStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'VIEWING_SCHEDULED'
  | 'NEGOTIATING'
  | 'CLOSED'
  | 'LOST';

export const INQUIRY_STATUSES: readonly InquiryStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'VIEWING_SCHEDULED',
  'NEGOTIATING',
  'CLOSED',
  'LOST',
];

export const OPEN_INQUIRY_STATUSES: readonly InquiryStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'VIEWING_SCHEDULED',
  'NEGOTIATING',
];

export interface Inquiry {
  readonly id: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingPhoto: string | null;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly agentId: string | null;
  readonly agentName: string | null;
  readonly conversationId: string;
  readonly status: InquiryStatus;
  readonly message: string;
  readonly questions: readonly string[];
  readonly buyerBudgetCentavos: number | null;
  readonly lostReason: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly statusChangedAt: Date;
  readonly firstResponseAt: Date | null;
}
