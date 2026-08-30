/**
 * PHP formatting for the whole app.
 *
 * Amounts are **integer centavos**, never floats — the rule the domain money
 * model fixes (docs/03-domain/money-model.md, P-06). Formatting is the only
 * place a peso value becomes a string, so there is exactly one place to get it
 * wrong.
 */
const whole = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const exact = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `850000` → `₱8,500` */
export const peso = (centavos: number) => whole.format(centavos / 100);

/** `850050` → `₱8,500.50`. For anything that has to reconcile. */
export const pesoExact = (centavos: number) => exact.format(centavos / 100);

export const perMonth = (centavos: number) => `${peso(centavos)}/mo`;

const dateFmt = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

const monthFmt = new Intl.DateTimeFormat("en-PH", { month: "short" });
const monthYearFmt = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
});

/** `"2026-08"` → `"Aug"`, for the collection chart's x-axis. */
export const formatMonth = (yyyyMm: string) =>
  monthFmt.format(new Date(`${yyyyMm}-01T00:00:00Z`));

/** `"2026-08"` → `"August 2026"`. */
export const formatMonthYear = (yyyyMm: string) =>
  monthYearFmt.format(new Date(`${yyyyMm}-01T00:00:00Z`));

/** Whole days from today; negative means in the past. */
export function daysFromToday(iso: string, today = new Date()): number {
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(iso);
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86_400_000);
}

export function relativeDue(iso: string): string {
  const days = daysFromToday(iso);
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  if (days > 1) return `due in ${days} days`;
  if (days === -1) return "1 day overdue";
  return `${Math.abs(days)} days overdue`;
}
