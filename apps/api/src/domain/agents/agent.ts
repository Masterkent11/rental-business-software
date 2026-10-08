export * from './agent-rules.ts';
export * from './agent-errors.ts';
export * from './representation.ts';

export type AgentVerificationState = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export type AgentPublicState = 'PUBLIC' | 'HIDDEN';

export interface AgentProfile {
  readonly id: string;
  readonly userId: string;
  readonly displayName: string;
  readonly headline: string;
  readonly bio: string;
  readonly photoUrl: string | null;
  readonly licenseNumber: string | null;
  readonly licenseAuthority: string | null;
  readonly verificationState: AgentVerificationState;
  readonly verifiedAt: Date | null;
  readonly specialties: readonly string[];
  readonly areasServed: readonly string[];
  readonly languages: readonly string[];
  readonly publicState: AgentPublicState;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AgentProfileInput {
  readonly displayName: string;
  readonly headline: string;
  readonly bio: string;
  readonly licenseNumber: string | null;
  readonly licenseAuthority: string | null;
  readonly specialties: readonly string[];
  readonly areasServed: readonly string[];
  readonly languages: readonly string[];
  readonly publicState: AgentPublicState;
  readonly photoUrl: string | null;
}

export interface ResponseSample {
  readonly createdAt: Date;
  readonly firstResponseAt: Date | null;
}

export interface AgentResponseMetrics {
  readonly sampleSize: number;
  readonly respondedWithinDayRate: number | null;
  readonly medianResponseMinutes: number | null;
}

export interface AgentPublicStats extends AgentResponseMetrics {
  readonly activeListings: number;
}
