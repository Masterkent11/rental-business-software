import type { Viewing, ViewingActor, ViewingStatus } from '@/domain/viewings/viewing.ts';
import type { PartyScope } from './party-scope.port.ts';

export interface NewViewing {
  readonly organizationId: string;
  readonly listingId: string;
  readonly customerId: string;
  readonly agentId: string | null;
  readonly inquiryId: string | null;
  readonly scheduledAt: Date;
  readonly durationMinutes: number;
  readonly customerNote: string;
  readonly clientRef: string;
  readonly requestMessage: string;
  readonly requestPreview: string;
}

export interface ViewingRange {
  readonly from?: Date;
  readonly to?: Date;
}

export interface ViewingChange {
  readonly status: ViewingStatus;
  readonly scheduledAt?: Date;
  readonly partnerNote?: string;
  readonly customerNote?: string;
  readonly cancelledByRole?: ViewingActor;
  readonly at: Date;
}

export interface ViewingRepository {
  submit(input: NewViewing): Promise<{ readonly viewing: Viewing; readonly created: boolean }>;
  takenSlots(listingId: string, from: Date, to: Date): Promise<readonly number[]>;
  findForCustomer(customerId: string, id: string): Promise<Viewing | null>;
  listForCustomer(customerId: string): Promise<readonly Viewing[]>;
  findForOrganization(organizationId: string, id: string): Promise<Viewing | null>;
  listForOrganization(organizationId: string, range: ViewingRange): Promise<readonly Viewing[]>;
  findForAgent(agentUserId: string, id: string): Promise<Viewing | null>;
  listForAgent(agentUserId: string, range: ViewingRange): Promise<readonly Viewing[]>;
  transition(scope: PartyScope, id: string, change: ViewingChange): Promise<Viewing>;
}
