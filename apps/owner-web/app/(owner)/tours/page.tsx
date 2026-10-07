"use client";

import { useEffect } from "react";
import { Rotate3d } from "lucide-react";
import { Page, TopBar } from "@/components/owner/shell";
import { Badge, Card, EmptyState, ErrorState, SkeletonRows } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
import { useListingsStore } from "@/stores/use-listings-store";
import { useSessionStore } from "@/stores/use-session-store";

export default function ToursPage() {
  const organizationId = useSessionStore((s) => s.activeOrganizationId);
  const { listings, loading, loaded, error, load } = useListingsStore();

  useEffect(() => {
    if (organizationId) void load(organizationId);
  }, [organizationId, load]);

  return (
    <Page>
      <TopBar
        title="Virtual tours"
        caption="360° walkthroughs customers open from a listing. Tours are processed server-side into tiles that load quickly on phones."
      />
      <Card>
        {loading && !loaded ? (
          <SkeletonRows rows={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => organizationId && void load(organizationId)} />
        ) : listings.length === 0 ? (
          <EmptyState icon={<Rotate3d className="size-5" aria-hidden />} title="No listings yet" body="Create a property first; tours attach to the place you list." />
        ) : (
          <ul className="divide-y divide-border">
            {listings.map((listing) => (
              <li key={listing.id} className="flex items-center gap-4 px-5 py-4">
                <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
                  {listing.photos[0] ? <Photo src={listing.photos[0]} alt="" className="size-full" sizes="48px" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{listing.title}</p>
                  <p className="text-[12.5px] text-muted">{listing.propertyName}</p>
                </div>
                {listing.hasTour ? (
                  <Badge tone="ok">{listing.sceneCount} room{listing.sceneCount === 1 ? "" : "s"} · live</Badge>
                ) : (
                  <Badge>No tour</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
        Tours are prepared by the Rental Platform team from your 360° photos. Listings without a published tour simply don&apos;t show the tour button in the app.
      </p>
    </Page>
  );
}
