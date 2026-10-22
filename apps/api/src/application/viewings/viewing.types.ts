import type { Viewing } from '@/domain/viewings/viewing.ts';

export interface AssignedAgentView {
  readonly agentId: string;
  readonly displayName: string;
  readonly headline: string;
  readonly photoUrl: string | null;
  readonly verified: boolean;
  readonly organizationName: string;
}

export interface CustomerViewingView {
  readonly viewing: Viewing;
  readonly agent: AssignedAgentView | null;
}
