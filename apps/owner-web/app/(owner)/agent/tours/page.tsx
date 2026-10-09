"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Rotate3d } from "lucide-react";
import { Page, TopBar } from "@/components/owner/shell";
import { Badge, Card, EmptyState, ErrorState, SkeletonRows } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
import { useAgentStore } from "@/stores/use-agent-store";

export default function AgentToursPage() {
  const { representations, representationsLoaded, representationsError, loadRepresentations } = useAgentStore();

  useEffect(() => {
    void loadRepresentations();
  }, [loadRepresentations]);

  const manageable = representations.filter((r) => r.state === "ACTIVE" && r.permissions.canManageTour);

  return (
    <Page>
      <TopBar title="Virtual tours" caption="Tours for properties where the owner lets you manage the walkthrough." />
      <Card>
        {!representationsLoaded ? (
          <SkeletonRows rows={3} />
        ) : representationsError ? (
          <ErrorState message={representationsError} onRetry={() => void loadRepresentations()} />
        ) : manageable.length === 0 ? (
          <EmptyState icon={<Rotate3d className="size-5" aria-hidden />} title="No tours to manage" body="Owners can allow you to manage the virtual tour when they invite you to a property." />
        ) : (
          <ul className="divide-y divide-border">
            {manageable.map((r) => (
              <li key={r.id}>
                <Link href={`/agent/tours/${r.listingId}`} className="focusable flex items-center gap-4 px-5 py-4 hover:bg-surface-secondary/50">
                  <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
                    {r.listingPhoto ? <Photo src={r.listingPhoto} alt="" className="size-full" sizes="48px" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{r.listingTitle}</p>
                    <p className="text-[12.5px] text-muted">{r.organizationName}</p>
                  </div>
                  <Badge tone="dark">{r.listingIntent === "SALE" ? "For sale" : "For rent"}</Badge>
                  <span className="hidden text-[13px] font-medium sm:block">Open studio</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  );
}
