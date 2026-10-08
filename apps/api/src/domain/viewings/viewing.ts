export * from './viewing-rules.ts';
export * from './viewing-errors.ts';

export type ViewingStatus = 'REQUESTED' | 'CONFIRMED' | 'RESCHEDULE_REQUESTED' | 'COMPLETED' | 'CANCELLED';

export const ACTIVE_VIEWING_STATUSES: readonly ViewingStatus[] = ['REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'];

export type ViewingActor = 'CUSTOMER' | 'OWNER' | 'AGENT';

export type ViewingAction = 'CONFIRM' | 'REQUEST_RESCHEDULE' | 'RESCHEDULE' | 'CANCEL' | 'COMPLETE';

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
  readonly scheduledAt: Date;
  readonly durationMinutes: number;
  readonly status: ViewingStatus;
  readonly customerNote: string;
  readonly partnerNote: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly confirmedAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly cancelledByRole: ViewingActor | null;
}

export interface ViewingSlot {
  readonly startsAt: Date;
  readonly available: boolean;
}

export interface ViewingDay {
  readonly date: string;
  readonly slots: readonly ViewingSlot[];
}
