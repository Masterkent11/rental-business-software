import Image from "next/image";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page, Panel, TopBar } from "@/components/owner/shell";
import { OccupancyBar } from "@/components/owner/charts";
import { Pill } from "@/components/owner/status";
import { properties, totalResources, totalVacant } from "@/lib/fixtures";
import { peso } from "@/lib/money";

/**
 * Properties.
 *
 * The figure that matters per property is not "how many units" but **what the
 * vacancy is costing** — contracted rent against what the property could earn
 * if it were full. A vacant bed space earns nothing and shows up nowhere on a
 * revenue chart, which is exactly how it stays vacant.
 */
export default function PropertiesPage() {
  const potential = properties.reduce((n, p) => n + p.monthlyPotential, 0);
  const contracted = properties.reduce((n, p) => n + p.monthlyContracted, 0);

  return (
    <>
      <TopBar
        title="Properties"
        caption={`${properties.length} properties · ${totalResources} rentable resources · ${totalVacant} vacant`}
        action={
          <Button className="rounded-[11px]">
            <Plus className="size-4" /> Add property
          </Button>
        }
      />

      <Page>
        <div className="grid gap-4 sm:grid-cols-3">
          <Panel className="p-5">
            <p className="label-caps text-muted-foreground">Contracted</p>
            <p className="text-amount mt-2 text-[28px] leading-none">
              {peso(contracted)}
              <span className="text-muted-foreground text-[13px] font-normal">
                /mo
              </span>
            </p>
          </Panel>
          <Panel className="p-5">
            <p className="label-caps text-muted-foreground">If fully let</p>
            <p className="text-amount mt-2 text-[28px] leading-none">
              {peso(potential)}
              <span className="text-muted-foreground text-[13px] font-normal">
                /mo
              </span>
            </p>
          </Panel>
          <Panel tone="money" className="p-5">
            <p className="label-caps text-money">Vacancy is costing</p>
            <p className="text-amount text-money mt-2 text-[28px] leading-none">
              {peso(potential - contracted)}
              <span className="text-[13px] font-normal">/mo</span>
            </p>
          </Panel>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => {
            const rate = Math.round((p.occupied / p.resourceCount) * 100);
            return (
              <Panel key={p.id} className="overflow-hidden p-0">
                <div className="relative h-[150px]">
                  <Image
                    src={p.photo}
                    alt={p.name}
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 420px"
                    className="object-cover"
                  />
                  <div className="scrim-card absolute inset-0" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold text-white">
                        {p.name}
                      </p>
                      <p className="truncate text-[12.5px] text-white/75">
                        {p.areaLabel}
                      </p>
                    </div>
                    <span className="glass shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold">
                      {rate}%
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <OccupancyBar
                    occupied={p.occupied}
                    reserved={p.reserved}
                    vacant={p.vacant}
                  />
                  <div className="text-muted-foreground mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
                    <span>{p.occupied} occupied</span>
                    <span>{p.reserved} reserved</span>
                    <span className={p.vacant > 0 ? "text-foreground font-medium" : ""}>
                      {p.vacant} vacant
                    </span>
                  </div>

                  <div className="border-border mt-4 flex items-end justify-between gap-3 border-t pt-4">
                    <div>
                      <p className="label-caps text-muted-foreground">
                        Contracted
                      </p>
                      <p className="text-amount mt-1 text-[17px]">
                        {peso(p.monthlyContracted)}
                      </p>
                    </div>
                    {p.vacant > 0 ? (
                      <Pill variant="money">
                        {peso(p.monthlyPotential - p.monthlyContracted)} idle
                      </Pill>
                    ) : (
                      <Pill variant="ok">Fully let</Pill>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>

        <p className="text-muted-foreground mt-6 max-w-2xl text-[12.5px] leading-relaxed">
          Occupancy comes from one timeline per resource, computed server-side —
          a bed inside an occupied unit is never separately lettable, and this
          page never recalculates that for itself.
        </p>
      </Page>
    </>
  );
}
