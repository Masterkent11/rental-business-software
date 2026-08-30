export interface VerifiedToken {
  readonly userId: string;
  readonly email: string | null;
  readonly mobile: string | null;
}

export interface IdentityProvider {
  verify(token: string): Promise<VerifiedToken | null>;
}
