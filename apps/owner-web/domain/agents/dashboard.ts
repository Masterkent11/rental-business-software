import type { AgentProfile } from "./agent";
import type { InquiryStatus } from "../inquiries/inquiry";

export interface ScheduleItem {
  readonly kind: "VIEWING" | "FOLLOW_UP";
  readonly id: string;
  readonly at: string;
  readonly title: string;
  readonly subtitle: string;
  readonly status: string;
}

export interface AgentDashboard {
  readonly agent: AgentProfile;
  readonly metrics: {
    readonly newInquiries: number;
    readonly activeClients: number;
    readonly viewingsToday: number;
    readonly followUpsDue: number;
    readonly dealsInProgress: number;
    readonly pendingInvitations: number;
    readonly representedListings: number;
  };
  readonly response: {
    readonly sampleSize: number;
    readonly respondedWithinDayRate: number | null;
    readonly medianResponseMinutes: number | null;
  };
  readonly pipeline: Readonly<Record<InquiryStatus, number>>;
  readonly today: readonly ScheduleItem[];
  readonly recentInquiries: readonly {
    readonly id: string;
    readonly listingTitle: string;
    readonly customerName: string;
    readonly status: InquiryStatus;
    readonly createdAt: string;
    readonly conversationId: string;
  }[];
}

export interface AgentTask {
  readonly id: string;
  readonly title: string;
  readonly dueAt: string;
  readonly doneAt: string | null;
  readonly inquiryId: string | null;
  readonly customerName: string | null;
  readonly listingTitle: string | null;
}

export interface AgentClient {
  readonly customerId: string;
  readonly customerName: string;
  readonly openInquiries: number;
  readonly totalInquiries: number;
  readonly upcomingViewings: number;
  readonly lastActivityAt: string;
  readonly latestConversationId: string | null;
  readonly latestListingTitle: string;
  readonly latestStatus: InquiryStatus;
}

export function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return "Not enough data yet";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 6) / 10;
  return `${hours} h`;
}

export const isOverdue = (task: AgentTask, now: Date) => task.doneAt === null && new Date(task.dueAt).getTime() < now.getTime();
