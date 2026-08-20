import { cn } from "@/lib/utils";

const tone = {
  ok: "bg-ok-soft text-ok border-ok/20",
  bad: "bg-bad-soft text-bad border-bad/20",
  money: "bg-money-soft text-money border-money/20",
  pending: "bg-pending-soft text-pending border-pending/25",
  neutral: "bg-secondary text-muted-foreground border-transparent",
} as const;

export type Tone = keyof typeof tone;

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
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[11.5px] font-medium whitespace-nowrap",
        tone[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Payment origin, never flattened.
 *
 * Online means the platform moved the money and can prove it. Recorded means a
 * staff member attests that cash changed hands and the platform processed
 * nothing (D-09). An owner's payment list that renders these identically is
 * claiming a certainty it does not have.
 */
export function OriginPill({
  origin,
  method,
  recordedBy,
}: {
  origin: "ONLINE" | "OFFLINE_RECORDED";
  method?: string;
  recordedBy?: string;
}) {
  return origin === "ONLINE" ? (
    <Pill variant="ok">{method ?? "Online"}</Pill>
  ) : (
    <Pill variant="neutral">Cash · {recordedBy}</Pill>
  );
}

const listingTone: Record<string, { label: string; variant: Tone }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  PENDING_APPROVAL: { label: "Awaiting approval", variant: "pending" },
  PUBLISHED: { label: "Published", variant: "ok" },
  REJECTED: { label: "Rejected", variant: "bad" },
};

export function ListingStatus({ state }: { state: string }) {
  const s = listingTone[state] ?? listingTone.DRAFT;
  return <Pill variant={s.variant}>{s.label}</Pill>;
}

const maintTone: Record<string, { label: string; variant: Tone }> = {
  REPORTED: { label: "Not acknowledged", variant: "bad" },
  ACKNOWLEDGED: { label: "Acknowledged", variant: "pending" },
  IN_PROGRESS: { label: "In progress", variant: "money" },
  RESOLVED: { label: "Resolved", variant: "ok" },
};

export function MaintenanceStatus({ state }: { state: string }) {
  const s = maintTone[state] ?? maintTone.REPORTED;
  return <Pill variant={s.variant}>{s.label}</Pill>;
}
