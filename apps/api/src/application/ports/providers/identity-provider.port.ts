export interface VerifiedToken {
  readonly assuranceLevel?: 'aal1' | 'aal2';
  readonly userId: string;
  readonly email: string | null;
  readonly mobile: string | null;
  readonly displayName?: string | null;
}

export interface IdentityProvider {
  verify(token: string): Promise<VerifiedToken | null>;
}
