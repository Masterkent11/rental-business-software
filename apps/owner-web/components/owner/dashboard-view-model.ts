import type { Conversation } from "../../domain/messaging/conversation";
import { totals, type PartnerAnalytics } from "../../domain/analytics/analytics";

export function recentConversations(conversations: readonly Conversation[], limit = 4): readonly Conversation[] {
  return [...new Map(conversations.map(item => [item.id, item])).values()]
    .filter(item => item.lastMessageAt !== null)
    .sort((a, b) => Date.parse(b.lastMessageAt!) - Date.parse(a.lastMessageAt!))
    .slice(0, limit);
}

export function bookingTrend(analytics: PartnerAnalytics | null) {
  if (!analytics) return null;
  const weekly = [...analytics.weekly].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  return { total: totals(analytics).bookings, values: weekly.map(item => item.bookings) };
}
