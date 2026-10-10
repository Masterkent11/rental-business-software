import type {
  AgentProfile,
  AgentProfileInput,
  AgentVerificationState,
  ResponseSample,
} from '@/domain/agents/agent.ts';

export interface AgentSearchQuery {
  readonly text?: string;
  readonly area?: string;
  readonly limit: number;
}

export interface AgentRepository {
  findByUser(userId: string): Promise<AgentProfile | null>;
  findPublic(agentId: string): Promise<AgentProfile | null>;
  findAssigned(customerId: string, agentId: string): Promise<AgentProfile | null>;
  searchPublic(query: AgentSearchQuery): Promise<readonly AgentProfile[]>;
  create(userId: string, input: AgentProfileInput): Promise<AgentProfile>;
  update(userId: string, input: AgentProfileInput): Promise<AgentProfile>;
  requestVerification(userId: string): Promise<AgentProfile>;
  pendingVerification(adminUserId: string): Promise<readonly AgentProfile[]>;
  decideVerification(input: {
    readonly adminUserId: string;
    readonly agentId: string;
    readonly current: AgentVerificationState;
    readonly next: AgentVerificationState;
    readonly note: string | null;
  }): Promise<AgentProfile | null>;
  findForAdmin(adminUserId: string, agentId: string): Promise<AgentProfile | null>;
  responseSamples(agentId: string, since: Date): Promise<readonly ResponseSample[]>;
  activeListingCount(agentId: string): Promise<number>;
  publishedListingIds(agentId: string): Promise<readonly string[]>;
}
