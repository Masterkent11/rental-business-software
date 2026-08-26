"use client";

import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import type { PartialTheme } from "@nivo/theming";

import { peso } from "@/lib/money";

/**
 * Nivo, wearing this product's palette.
 *
 * Every colour here is a CSS custom property rather than a literal, so the
 * charts follow the theme the rest of the surface already obeys — including
 * the dark variant — without a second palette to keep in sync. Nivo writes
 * these straight onto SVG `fill` and `stroke`, where `var()` resolves at paint
 * time like anywhere else.
 */
const ink = "var(--muted-foreground)";
const line = "var(--border)";

const nivoTheme: PartialTheme = {
  background: "transparent",
  text: {
    fontSize: 11.5,
    fill: ink,
    fontFamily: "var(--font-sans)",
  },
  axis: {
    domain: { line: { stroke: "transparent" } },
    ticks: {
      line: { stroke: "transparent" },
      text: { fill: ink, fontSize: 11.5 },
    },
    legend: { text: { fill: ink } },
  },
  grid: {
    line: { stroke: line, strokeWidth: 1, strokeDasharray: "3 4" },
  },
  tooltip: {
    container: {
      background: "var(--popover)",
      color: "var(--popover-foreground)",
      fontSize: 12.5,
      borderRadius: 12,
      border: `1px solid ${line}`,
      boxShadow: "0 8px 28px rgb(0 0 0 / 0.10)",
      padding: "8px 11px",
    },
  },
};

/** A tooltip that reads like a sentence, not a data dump. */
function Readout({
  swatch,
  label,
  value,
}: {
  swatch: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: swatch }}
      />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Claimed against received, month by month.
 *
 * Grouped rather than stacked on purpose: received is not a part of claimed,
 * it is a **rival** to it, and the whole point of the chart is the daylight
 * between the two bars.
 */
export function CollectionChart({
  data,
}: {
  data: { month: string; claimed: number; received: number }[];
}) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveBar
        data={data}
        keys={["claimed", "received"]}
        indexBy="month"
        groupMode="grouped"
        margin={{ top: 8, right: 4, bottom: 28, left: 68 }}
        padding={0.32}
        innerPadding={3}
        borderRadius={5}
        colors={({ id }) =>
          // Two tones of one hue rather than two hues: received is not a
          // different *kind* of thing from claimed, it is how much of it
          // actually arrived.
          id === "claimed" ? "var(--accent-soft)" : "var(--accent)"
        }
        enableLabel={false}
        theme={nivoTheme}
        axisLeft={{
          tickSize: 0,
          tickPadding: 10,
          tickValues: 4,
          format: (v) => peso(Number(v)),
        }}
        axisBottom={{ tickSize: 0, tickPadding: 10 }}
        gridYValues={4}
        motionConfig="gentle"
        tooltip={({ id, value, indexValue, color }) => (
          <div className="space-y-1">
            <p className="font-semibold">{indexValue}</p>
            <Readout swatch={color} label={String(id)} value={peso(value)} />
          </div>
        )}
      />
    </div>
  );
}

/**
 * Occupancy as a ring.
 *
 * Three slices, because "not occupied" is two different problems: a reserved
 * resource is spoken for and a vacant one is earning nothing.
 */
export function OccupancyDonut({
  occupied,
  reserved,
  vacant,
}: {
  occupied: number;
  reserved: number;
  vacant: number;
}) {
  const total = occupied + reserved + vacant;
  const data = [
    { id: "Occupied", value: occupied, color: "var(--success)" },
    { id: "Reserved", value: reserved, color: "var(--warning)" },
    { id: "Vacant", value: vacant, color: "var(--surface-tertiary)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="relative size-[108px] shrink-0">
      <ResponsivePie
        data={data}
        innerRadius={0.76}
        padAngle={1.6}
        cornerRadius={3}
        margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        colors={{ datum: "data.color" }}
        borderWidth={0}
        enableArcLabels={false}
        enableArcLinkLabels={false}
        activeOuterRadiusOffset={4}
        theme={nivoTheme}
        motionConfig="gentle"
        tooltip={({ datum }) => (
          <Readout
            swatch={datum.color}
            label={String(datum.id)}
            value={`${datum.value} of ${total}`}
          />
        )}
      />
      {/* The number belongs in the hole; a ring with a legend beside it makes
          the reader do arithmetic the chart already did. */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-amount text-[19px] leading-none">
            {total === 0 ? "—" : `${Math.round((occupied / total) * 100)}%`}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[10.5px]">occupied</p>
        </div>
      </div>
    </div>
  );
}

/** A bare trend line for a KPI card — no axes, no grid, just the shape. */
export function Trend({
  points,
  tone = "money",
}: {
  points: number[];
  tone?: "money" | "plain";
}) {
  const stroke = tone === "money" ? "var(--accent)" : "var(--muted)";

  return (
    <div className="h-[38px] w-[92px]">
      <ResponsiveLine
        data={[
          {
            id: "trend",
            data: points.map((y, x) => ({ x, y })),
          },
        ]}
        margin={{ top: 6, right: 4, bottom: 6, left: 4 }}
        yScale={{ type: "linear", min: "auto", max: "auto" }}
        curve="monotoneX"
        colors={[stroke]}
        lineWidth={2}
        enablePoints={false}
        enableGridX={false}
        enableGridY={false}
        axisTop={null}
        axisRight={null}
        axisBottom={null}
        axisLeft={null}
        isInteractive={false}
        theme={nivoTheme}
        motionConfig="gentle"
      />
    </div>
  );
}
