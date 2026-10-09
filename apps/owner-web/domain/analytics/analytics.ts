import type { InquiryStatus } from "../inquiries/inquiry";
import type { ViewingStatus } from "../viewings/viewing";

export interface ListingPerformance {
  readonly listingId: string;
  readonly title: string;
  readonly intent: "RENT" | "SALE";
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

export function conversionRate(analytics: PartnerAnalytics): number | null {
  const total = Object.values(analytics.inquiriesByStatus).reduce((sum, n) => sum + n, 0);
  if (total === 0) return null;
  return analytics.inquiriesByStatus.CLOSED / total;
}

export function totals(analytics: PartnerAnalytics) {
  return {
    inquiries: Object.values(analytics.inquiriesByStatus).reduce((sum, n) => sum + n, 0),
    viewings: Object.values(analytics.viewingsByStatus).reduce((sum, n) => sum + n, 0),
    completedViewings: analytics.viewingsByStatus.COMPLETED,
    bookings: analytics.weekly.reduce((sum, w) => sum + w.bookings, 0),
  };
}
