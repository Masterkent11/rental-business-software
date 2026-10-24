export interface TenantInvoice {
  readonly id: string;
  readonly number: number;
  readonly dueOn: string;
  readonly totalCentavos: number;
  readonly paidCentavos: number;
  readonly outstandingCentavos: number;
  readonly state: string;
  readonly onlinePaymentAvailable: boolean;
  readonly lines: readonly { description: string; amountCentavos: number }[];
}

export interface TenantHome {
  readonly id: string;
  readonly tenantId: string;
  readonly kind: string;
  readonly state: string;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly propertyId: string;
  readonly listingId: string | null;
  readonly title: string;
  readonly unit: string;
  readonly address: string;
  readonly area: string;
  readonly propertyType: string;
  readonly description: string;
  readonly photos: readonly string[];
  readonly amenities: readonly string[];
  readonly rules: readonly string[];
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly landlordName: string;
  readonly invoices: readonly TenantInvoice[];
}

export function eligibleTenantHome(home: TenantHome, userId: string, today: string): boolean {
  return home.tenantId === userId && home.kind === 'LEASE' && home.state === 'COMMITTED'
    && (home.startsOn === null || home.startsOn <= today)
    && (home.endsOn === null || today < home.endsOn);
}

export class TenancyNotFoundError extends Error {}
