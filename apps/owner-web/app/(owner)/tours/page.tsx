import { Rotate3d } from "lucide-react";
import { Page, Panel, TopBar } from "@/components/owner/shell";
import { Pill } from "@/components/owner/status";
import { TourStudio } from "@/components/owner/tour-studio";
import { tour, tourSummaries } from "@/lib/tour-fixtures";

/**
 * Tours.
 *
 * The authoring surface for the V1 differentiator. Publishing here is what the
 * customer app reads — there is no sync step, because the tour hangs off the
 * rentable resource and both surfaces are clients of the same API. See
 * docs/07-integrations/virtual-tour-pipeline.md.
 */
export default function ToursPage() {
  return (
    <>
      <TopBar
        title="Virtual tours"
        caption={`${tour.resourceLabel} · ${tour.propertyName}`}
        action={
          <Pill variant={tour.state === "PUBLISHED" ? "ok" : "pending"}>
            {tour.state === "PUBLISHED" ? "Live in the customer app" : "Draft"}
          </Pill>
        }
      />

      <Page>
        <Panel className="mb-5 flex flex-wrap items-center gap-3 p-4">
          {tourSummaries.map((t) => (
            <button
              key={t.id}
              className={
                t.id === tour.id
                  ? "border-foreground bg-secondary flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium"
                  : "border-border hover:bg-secondary/60 flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors"
              }
            >
              <Rotate3d className="size-3.5" />
              {t.resourceLabel}
              <span className="text-muted-foreground">{t.scenes} scenes</span>
              {t.state === "DRAFT" ? <Pill variant="pending">draft</Pill> : null}
            </button>
          ))}
        </Panel>

        <TourStudio tour={tour} />

        <Panel className="mt-6 p-5">
          <p className="text-[13.5px] font-semibold">
            What happens when you publish
          </p>
          <p className="text-muted-foreground mt-2 max-w-3xl text-[12.5px] leading-relaxed">
            The tour belongs to the <strong>resource</strong>, not to a listing —
            so a resource offered both monthly and nightly shows the same
            walkthrough on both, authored once. Publishing makes it visible on
            the customer&rsquo;s next load; unpublishing removes it just as
            fast, because nothing is copied anywhere. Panoramas are tiled at
            upload rather than at view time, so a customer on mobile data sees a
            preview immediately and detail as it arrives.
          </p>
        </Panel>
      </Page>
    </>
  );
}
