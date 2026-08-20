import { cn } from "@/lib/utils";
import type { InvoiceState, MaintenanceState, PaymentOrigin } from "@/lib/fixtures";

/**
 * Status vocabulary, rendered once.
 *
 * The tenant journey lists the invoice states explicitly and insists they stay
 * distinguishable: a tenant who paid ₱5,000 of ₱8,500 must see exactly that,
 * not an unhelpful "unpaid".
 */
const tone = {
  ok: "bg-ok-soft text-ok border-ok/20",
  bad: "bg-bad-soft text-bad border-bad/20",
  money: "bg-money-soft text-money border-money/20",
  pending: "bg-pending-soft text-pending border-pending/25",
  neutral: "bg-muted text-muted-foreground border-transparent",
} as const;

type Tone = keyof typeof tone;

export function Pill({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        tone[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

const invoiceTone: Record<InvoiceState, { label: string; variant: Tone }> = {
  DUE: { label: "Due", variant: "money" },
  PARTIALLY_PAID: { label: "Partially paid", variant: "money" },
  PAID: { label: "Paid", variant: "ok" },
  OVERDUE: { label: "Overdue", variant: "bad" },
  WAIVED: { label: "Waived", variant: "neutral" },
};

export function InvoiceStatus({ state }: { state: InvoiceState }) {
  const { label, variant } = invoiceTone[state];
  return <Pill variant={variant}>{label}</Pill>;
}

const maintenanceTone: Record<MaintenanceState, { label: string; variant: Tone }> = {
  REPORTED: { label: "Submitted", variant: "pending" },
  ACKNOWLEDGED: { label: "Acknowledged", variant: "pending" },
  IN_PROGRESS: { label: "In progress", variant: "money" },
  RESOLVED: { label: "Resolved", variant: "ok" },
  CLOSED: { label: "Closed", variant: "neutral" },
};

export function MaintenanceStatus({ state }: { state: MaintenanceState }) {
  const { label, variant } = maintenanceTone[state];
  return <Pill variant={variant}>{label}</Pill>;
}

/**
 * The distinction D-09 exists to protect: an online payment means the platform
 * moved the money and can prove it. A recorded payment means a staff member
 * attests that cash changed hands and the platform processed nothing.
 *
 * Rendering these identically would be a bug, not a simplification.
 */
export function OriginBadge({ origin }: { origin: PaymentOrigin }) {
  return origin === "ONLINE" ? (
    <Pill variant="ok">Paid online</Pill>
  ) : (
    <Pill variant="neutral">Cash, recorded by staff</Pill>
  );
}
