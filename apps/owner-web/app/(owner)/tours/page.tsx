"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Rotate3d } from "lucide-react";
import { Page, TopBar } from "@/components/owner/shell";
import { Badge, Card, EmptyState, ErrorState, SkeletonRows } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
import { TOUR_STATE_LABEL } from "@/domain/tours/tour";
import { useSessionStore } from "@/stores/use-session-store";
import { useTourStudioStore } from "@/stores/use-tour-studio-store";

export default function ToursPage() {
  const organizationId = useSessionStore((s) => s.activeOrganizationId);
  const { overview, overviewLoaded, overviewError, loadOverview } = useTourStudioStore();

  useEffect(() => {
    if (organizationId) void loadOverview(organizationId);
  }, [organizationId, loadOverview]);

  return (
    <Page>
      <TopBar title="Virtual tours" caption="Build 360° walkthroughs room by room. Customers open them from the listing." />
      <Card>
        {!overviewLoaded ? (
          <SkeletonRows rows={4} />
        ) : overviewError ? (
          <ErrorState message={overviewError} onRetry={() => organizationId && void loadOverview(organizationId)} />
        ) : overview.length === 0 ? (
          <EmptyState icon={<Rotate3d className="size-5" aria-hidden />} title="No listings yet" body="Create a property first. Tours attach to the place you list." />
        ) : (
          <ul className="divide-y divide-border">
            {overview.map((item) => (
              <li key={item.listingId}>
                <Link href={`/tours/${item.listingId}`} className="focusable flex items-center gap-4 px-5 py-4 hover:bg-surface-secondary/50">
                  <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
                    {item.thumbnailUrl || item.listingPhoto ? <Photo src={(item.thumbnailUrl ?? item.listingPhoto)!} alt="" className="size-full" sizes="48px" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{item.listingTitle}</p>
                    <p className="text-[12.5px] text-muted">
                      {item.listingIntent === "SALE" ? "For sale" : "For rent"} · {`${item.sceneCount} room${item.sceneCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <Badge tone={item.state === "PUBLISHED" ? "ok" : item.state === "NONE" ? "neutral" : item.state === "FAILED" ? "bad" : "pending"}>{TOUR_STATE_LABEL[item.state]}</Badge>
                  <span className="hidden text-[13px] font-medium sm:block">{item.state === "NONE" ? "Create" : "Open studio"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  );
}
