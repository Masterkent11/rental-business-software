export interface TenancyActivation {
  readonly id: string;
  readonly state: 'COMMITTED';
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly confirmedAt: Date;
}

export interface TenancyActivationRepository {
  confirm(input: {
    organizationId: string;
    applicationId: string;
    confirmedBy: string;
    now: Date;
  }): Promise<TenancyActivation>;
}
