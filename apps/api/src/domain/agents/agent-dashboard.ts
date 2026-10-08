import { localDay } from '@/domain/shared/calendar.ts';
import type { Inquiry, InquiryStatus } from '@/domain/inquiries/inquiry.ts';
import { INQUIRY_STATUSES, isOpenInquiry } from '@/domain/inquiries/inquiry.ts';
import type { Viewing } from '@/domain/viewings/viewing.ts';

export interface ScheduleTask {
  readonly id: string;
  readonly title: string;
  readonly dueAt: Date;
  readonly doneAt: Date | null;
  readonly customerName: string | null;
}

export interface ScheduleItem {
  readonly kind: 'VIEWING' | 'FOLLOW_UP';
  readonly id: string;
  readonly at: Date;
  readonly title: string;
  readonly subtitle: string;
  readonly status: string;
}

export interface AgentWorkload {
  readonly newInquiries: number;
  readonly activeClients: number;
  readonly viewingsToday: number;
  readonly followUpsDue: number;
  readonly dealsInProgress: number;
  readonly pipeline: Readonly<Record<InquiryStatus, number>>;
  readonly today: readonly ScheduleItem[];
}

export function agentWorkload(input: {
  readonly now: Date;
  readonly inquiries: readonly Inquiry[];
  readonly viewings: readonly Viewing[];
  readonly tasks: readonly ScheduleTask[];
}): AgentWorkload {
  const today = localDay(input.now);
  const pipeline = Object.fromEntries(INQUIRY_STATUSES.map((status) => [status, 0])) as Record<InquiryStatus, number>;
  for (const inquiry of input.inquiries) pipeline[inquiry.status] += 1;

  const activeClients = new Set(
    input.inquiries.filter((inquiry) => isOpenInquiry(inquiry.status)).map((inquiry) => inquiry.customerId),
  ).size;

  const viewingsToday = input.viewings.filter(
    (viewing) =>
      localDay(viewing.scheduledAt) === today &&
      (viewing.status === 'CONFIRMED' || viewing.status === 'REQUESTED' || viewing.status === 'RESCHEDULE_REQUESTED'),
  );

  const dueTasks = input.tasks.filter((task) => task.doneAt === null && localDay(task.dueAt) <= today);

  const items: ScheduleItem[] = [
    ...viewingsToday.map<ScheduleItem>((viewing) => ({
      kind: 'VIEWING',
      id: viewing.id,
      at: viewing.scheduledAt,
      title: 'Property viewing',
      subtitle: `${viewing.customerName} · ${viewing.listingTitle}`,
      status: viewing.status,
    })),
    ...dueTasks.map<ScheduleItem>((task) => ({
      kind: 'FOLLOW_UP',
      id: task.id,
      at: task.dueAt,
      title: task.title,
      subtitle: task.customerName ?? 'Follow-up',
      status: localDay(task.dueAt) < today ? 'OVERDUE' : 'DUE',
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    newInquiries: pipeline.NEW,
    activeClients,
    viewingsToday: viewingsToday.length,
    followUpsDue: dueTasks.length,
    dealsInProgress: pipeline.NEGOTIATING,
    pipeline,
    today: items,
  };
}
