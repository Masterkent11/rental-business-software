import type { InquiryStatus } from '@/domain/inquiries/inquiry.ts';
import type { ViewingStatus } from '@/domain/viewings/viewing.ts';

export interface ListingPerformance {
  readonly listingId: string;
  readonly title: string;
  readonly intent: 'RENT' | 'SALE';
  readonly state: string;
  readonly inquiries: number;
  readonly viewings: number;
  readonly bookings: number;
  readonly conversations: number;
}

export interface WeeklyCount {
  readonly weekStart: string;
  readonly inquiries: number;
  readonly viewings: number;
  readonly bookings: number;
}

export interface PartnerAnalytics {
  readonly inquiriesByStatus: Readonly<Record<InquiryStatus, number>>;
  readonly viewingsByStatus: Readonly<Record<ViewingStatus, number>>;
  readonly weekly: readonly WeeklyCount[];
  readonly listings: readonly ListingPerformance[];
}

export interface AnalyticsRepository {
  forOrganization(organizationId: string, since: Date): Promise<PartnerAnalytics>;
  forAgent(agentUserId: string, since: Date): Promise<PartnerAnalytics>;
}
