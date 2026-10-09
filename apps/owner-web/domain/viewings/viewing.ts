export type ViewingStatus = "REQUESTED" | "CONFIRMED" | "RESCHEDULE_REQUESTED" | "COMPLETED" | "CANCELLED";

export type PartnerViewingAction = "CONFIRM" | "REQUEST_RESCHEDULE" | "CANCEL" | "COMPLETE";

export const VIEWING_STATUS_LABEL: Record<ViewingStatus, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  RESCHEDULE_REQUESTED: "New time requested",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ACTION_LABEL: Record<PartnerViewingAction, string> = {
  CONFIRM: "Confirm",
  REQUEST_RESCHEDULE: "Ask for another time",
  CANCEL: "Cancel",
  COMPLETE: "Mark completed",
};

export interface Viewing {
  readonly id: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingPhoto: string | null;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly organizationName: string;
  readonly agentName: string | null;
  readonly inquiryId: string | null;
  readonly conversationId: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly scheduledAt: string;
  readonly durationMinutes: number;
  readonly status: ViewingStatus;
  readonly customerNote: string;
  readonly partnerNote: string;
  readonly cancelledByRole: string | null;
}

export function actionsFor(viewing: Pick<Viewing, "status" | "scheduledAt">, now: Date): readonly PartnerViewingAction[] {
  const started = new Date(viewing.scheduledAt).getTime() <= now.getTime();
  switch (viewing.status) {
    case "REQUESTED":
      return started ? ["CANCEL"] : ["CONFIRM", "REQUEST_RESCHEDULE", "CANCEL"];
    case "CONFIRMED":
      return started ? ["COMPLETE", "CANCEL"] : ["REQUEST_RESCHEDULE", "CANCEL"];
    case "RESCHEDULE_REQUESTED":
      return ["CANCEL"];
    default:
      return [];
  }
}

export const MANILA = "Asia/Manila";

export function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MANILA, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

export function groupByDay(viewings: readonly Viewing[]): { day: string; items: Viewing[] }[] {
  const map = new Map<string, Viewing[]>();
  for (const viewing of [...viewings].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))) {
    const key = dayKey(viewing.scheduledAt);
    map.set(key, [...(map.get(key) ?? []), viewing]);
  }
  return [...map.entries()].map(([day, items]) => ({ day, items }));
}

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: MANILA, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export const formatDay = (day: string) =>
  new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
