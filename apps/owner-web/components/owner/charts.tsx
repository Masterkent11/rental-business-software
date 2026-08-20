import { peso } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Charts, hand-drawn as SVG.
 *
 * No charting library: three shapes are needed, each is a dozen lines, and a
 * dependency would bring a theming system that fights the tokens rather than
 * using them. Every colour below is a CSS variable, so light and dark follow
 * the rest of the product for free.
 */

/**
 * Claimed against received, by month.
 *
 * The whole point of the chart is the **gap**: an invoice is a claim, money is
 * money, and the distance between the two bars is the question the owner asks.
 * A single "revenue" series would hide exactly what they need to see.
 */
export function CollectionChart({
  data,
}: {
  data: { month: string; claimed: number; received: number }[];
}) {
  const max = Math.max(...data.map((d) => d.claimed)) * 1.08;

  return (
    <div>
      <div className="flex items-end gap-3 sm:gap-5">
        {data.map((d) => {
          const shortfall = d.claimed - d.received;
          return (
            <div key={d.month} className="group flex flex-1 flex-col items-center gap-2">
              <div className="relative flex h-[132px] w-full items-end justify-center gap-[3px]">
                <div
                  className="w-full max-w-[16px] rounded-t-[5px] bg-[var(--color-track)]"
                  style={{ height: `${(d.claimed / max) * 100}%` }}
                  title={`Claimed ${peso(d.claimed)}`}
                />
                <div
                  className={cn(
                    "w-full max-w-[16px] rounded-t-[5px]",
                    shortfall > 0 ? "bg-[var(--color-money)]" : "bg-[var(--color-ok)]",
                  )}
                  style={{ height: `${(d.received / max) * 100}%` }}
                  title={`Received ${peso(d.received)}`}
                />
              </div>
              <span className="text-muted-foreground text-[11.5px] font-medium">
                {d.month}
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-muted-foreground mt-4 flex items-center gap-4 text-[12px]">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-[var(--color-track)]" />
          Claimed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-[var(--color-ok)]" />
          Received in full
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-[var(--color-money)]" />
          Short
        </span>
      </div>
    </div>
  );
}

/** A segmented occupancy bar: occupied · reserved · vacant. */
export function OccupancyBar({
  occupied,
  reserved,
  vacant,
  className,
}: {
  occupied: number;
  reserved: number;
  vacant: number;
  className?: string;
}) {
  const total = occupied + reserved + vacant;
  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div className={cn("flex h-2 gap-[2px] overflow-hidden rounded-full", className)}>
      <div className="bg-[var(--color-ok)]" style={{ width: pct(occupied) }} />
      <div className="bg-[var(--color-pending)]" style={{ width: pct(reserved) }} />
      <div className="bg-[var(--color-track)]" style={{ width: pct(vacant) }} />
    </div>
  );
}

/** Sparkline for a KPI tile. */
export function Sparkline({
  points,
  tone = "plain",
}: {
  points: number[];
  tone?: "money" | "ok" | "bad" | "plain";
}) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const w = 72;
  const h = 24;

  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const stroke = {
    money: "var(--color-money)",
    ok: "var(--color-ok)",
    bad: "var(--color-bad)",
    plain: "var(--color-muted-foreground)",
  }[tone];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={w}
        cy={h - ((points[points.length - 1] - min) / span) * h}
        r={2.5}
        fill={stroke}
      />
    </svg>
  );
}

/** Ring gauge for a single percentage. */
export function Ring({ value, label }: { value: number; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const filled = (value / 100) * c;

  return (
    <div className="relative grid place-items-center">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-track)" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="var(--color-ok)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-amount text-[20px] leading-none">{value}%</p>
        <p className="text-muted-foreground mt-0.5 text-[10.5px]">{label}</p>
      </div>
    </div>
  );
}
