export type ViewingStatus =
  | "MATCHING"
  | "REQUESTED"
  | "CONFIRMED"
  | "RESCHEDULE_REQUESTED"
  | "DECLINED"
  | "COMPLETED"
  | "CANCELLED";

export type PreferredTimeWindow = "MORNING" | "AFTERNOON" | "EVENING";

export type PartnerViewingAction = "CONFIRM" | "REQUEST_RESCHEDULE" | "DECLINE" | "CANCEL" | "COMPLETE";

export type PartnerRole = "OWNER" | "AGENT";

export const VIEWING_STATUS_LABEL: Record<ViewingStatus, string> = {
  MATCHING: "Finding a specialist",
  REQUESTED: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  RESCHEDULE_REQUESTED: "New time suggested",
  DECLINED: "No specialist available",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ACTION_LABEL: Record<PartnerViewingAction, string> = {
  CONFIRM: "Confirm",
  REQUEST_RESCHEDULE: "Suggest another time",
  DECLINE: "I'm unavailable",
  CANCEL: "Cancel",
  COMPLETE: "Mark completed",
};

export const TIME_WINDOWS: Record<PreferredTimeWindow, { readonly label: string; readonly startHour: number; readonly endHour: number }> = {
  MORNING: { label: "Morning", startHour: 8, endHour: 12 },
  AFTERNOON: { label: "Afternoon", startHour: 12, endHour: 16 },
  EVENING: { label: "Evening", startHour: 16, endHour: 20 },
};

export const CONFIRMATION_STEP_MINUTES = 15;
export const MANILA = "Asia/Manila";
const MANILA_OFFSET = "+08:00";

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
  readonly preferredDate: string | null;
  readonly preferredTimeWindow: PreferredTimeWindow | null;
  readonly scheduledAt: string | null;
  readonly durationMinutes: number;
  readonly status: ViewingStatus;
  readonly customerNote: string;
  readonly partnerNote: string;
  readonly cancelledByRole: string | null;
  readonly assignedAt: string | null;
  readonly responseDueAt: string | null;
}

export function localInstant(day: string, time: string): string {
  return new Date(`${day}T${time}:00${MANILA_OFFSET}`).toISOString();
}

export function expectedStart(viewing: Pick<Viewing, "scheduledAt" | "preferredDate" | "preferredTimeWindow">): string | null {
  if (viewing.scheduledAt) return viewing.scheduledAt;
  if (viewing.preferredDate && viewing.preferredTimeWindow) {
    const hour = String(TIME_WINDOWS[viewing.preferredTimeWindow].startHour).padStart(2, "0");
    return localInstant(viewing.preferredDate, `${hour}:00`);
  }
  return null;
}

export function actionsFor(
  viewing: Pick<Viewing, "status" | "scheduledAt" | "preferredDate" | "preferredTimeWindow">,
  now: Date,
  role: PartnerRole,
): readonly PartnerViewingAction[] {
  const start = expectedStart(viewing);
  const started = start !== null && new Date(start).getTime() <= now.getTime();
  switch (viewing.status) {
    case "REQUESTED":
      return started
        ? ["CANCEL"]
        : role === "AGENT"
          ? ["CONFIRM", "REQUEST_RESCHEDULE", "DECLINE", "CANCEL"]
          : ["CONFIRM", "REQUEST_RESCHEDULE", "CANCEL"];
    case "CONFIRMED":
      return started ? ["COMPLETE", "CANCEL"] : ["REQUEST_RESCHEDULE", "CANCEL"];
    case "RESCHEDULE_REQUESTED":
    case "MATCHING":
      return ["CANCEL"];
    default:
      return [];
  }
}

export function confirmationTimes(window: PreferredTimeWindow | null): readonly string[] {
  const bounds = window ? TIME_WINDOWS[window] : { startHour: TIME_WINDOWS.MORNING.startHour, endHour: TIME_WINDOWS.EVENING.endHour };
  const times: string[] = [];
  for (let minutes = bounds.startHour * 60; minutes < bounds.endHour * 60; minutes += CONFIRMATION_STEP_MINUTES) {
    times.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
  }
  return times;
}

export function isUpcoming(viewing: Viewing, now: number): boolean {
  if (viewing.status === "COMPLETED" || viewing.status === "CANCELLED" || viewing.status === "DECLINED") return false;
  const start = expectedStart(viewing);
  return start === null || new Date(start).getTime() >= now - 2 * 60 * 60 * 1000;
}

export function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MANILA, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

export function groupByDay(viewings: readonly Viewing[]): { day: string; items: Viewing[] }[] {
  const map = new Map<string, Viewing[]>();
  const sorted = [...viewings].sort((a, b) => (expectedStart(a) ?? "").localeCompare(expectedStart(b) ?? ""));
  for (const viewing of sorted) {
    const start = expectedStart(viewing);
    const key = start ? dayKey(start) : viewing.preferredDate ?? "";
    map.set(key, [...(map.get(key) ?? []), viewing]);
  }
  return [...map.entries()].map(([day, items]) => ({ day, items }));
}

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: MANILA, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export const formatClock = (time: string) => formatTime(localInstant("2026-01-01", time));

export const formatDay = (day: string) =>
  new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );

export function windowLabel(window: PreferredTimeWindow): string {
  const bounds = TIME_WINDOWS[window];
  const hour = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? "PM" : "AM"}`;
  return `${bounds.label} (${hour(bounds.startHour)} – ${hour(bounds.endHour)})`;
}

export function scheduleLabel(viewing: Pick<Viewing, "scheduledAt" | "preferredTimeWindow">): string {
  if (viewing.scheduledAt) return formatTime(viewing.scheduledAt);
  return viewing.preferredTimeWindow ? TIME_WINDOWS[viewing.preferredTimeWindow].label : "To arrange";
}

export function relativeFrom(iso: string, now: number): string {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  const magnitude = Math.abs(minutes);
  const text = magnitude < 60 ? `${magnitude} min` : magnitude < 48 * 60 ? `${Math.round(magnitude / 60)} h` : `${Math.round(magnitude / 1440)} d`;
  return minutes >= 0 ? `in ${text}` : `${text} ago`;
}
