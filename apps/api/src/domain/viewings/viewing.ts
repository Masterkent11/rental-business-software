import type { PreferredTimeWindow } from '@/domain/assignment/lead-assignment.ts';

export * from './viewing-rules.ts';
export * from './viewing-errors.ts';

export type ViewingStatus =
  | 'MATCHING'
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'RESCHEDULE_REQUESTED'
  | 'DECLINED'
  | 'COMPLETED'
  | 'CANCELLED';

export const VIEWING_STATUSES: readonly ViewingStatus[] = [
  'MATCHING',
  'REQUESTED',
  'CONFIRMED',
  'RESCHEDULE_REQUESTED',
  'DECLINED',
  'COMPLETED',
  'CANCELLED',
];

export const ACTIVE_VIEWING_STATUSES: readonly ViewingStatus[] = ['MATCHING', 'REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'];

export type ViewingActor = 'CUSTOMER' | 'OWNER' | 'AGENT';

export type ViewingAction =
  | 'CONFIRM'
  | 'REQUEST_RESCHEDULE'
  | 'DECLINE'
  | 'RESCHEDULE'
  | 'ACCEPT_SUGGESTION'
  | 'CANCEL'
  | 'COMPLETE';

export interface Viewing {
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
  readonly inquiryId: string | null;
  readonly conversationId: string;
  readonly leadAssignmentId: string | null;
  readonly representationId: string | null;
  readonly preferredDate: string | null;
  readonly preferredWindow: PreferredTimeWindow | null;
  readonly timeZone: string;
  readonly scheduledAt: Date | null;
  readonly durationMinutes: number;
  readonly status: ViewingStatus;
  readonly customerNote: string;
  readonly partnerNote: string;
  readonly agentChangeNotice: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly confirmedAt: Date | null;
  readonly declinedAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly cancelledByRole: ViewingActor | null;
  readonly assignedAt: Date | null;
  readonly responseDueAt: Date | null;
}
