"use client";

import { useEffect } from "react";
import { ContactRound, MessageSquare } from "lucide-react";

import { Page, TableScroll, TopBar } from "@/components/owner/shell";
import { Badge, Card, EmptyState, ErrorState, LinkBtn, SkeletonRows } from "@/components/owner/ui";
import { formatDateTime } from "@/lib/money";
import { INQUIRY_STATUS_LABEL } from "@/domain/inquiries/inquiry";
import { useAgentStore } from "@/stores/use-agent-store";

export default function AgentClientsPage() {
  const { clients, clientsLoaded, clientsError, loadClients } = useAgentStore();

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  return (
    <Page>
      <TopBar title="Clients" caption="People who inquired about properties you represent." />
      <Card>
        {!clientsLoaded ? (
          <SkeletonRows rows={5} />
        ) : clientsError ? (
          <ErrorState message={clientsError} onRetry={() => void loadClients()} />
        ) : clients.length === 0 ? (
          <EmptyState icon={<ContactRound className="size-5" aria-hidden />} title="No clients yet" body="A client appears here after their first inquiry on one of your properties." />
        ) : (
          <TableScroll>
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[12px] text-muted">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Latest property</th>
                  <th className="px-3 py-3 font-medium">Stage</th>
                  <th className="px-3 py-3 font-medium">Open leads</th>
                  <th className="px-3 py-3 font-medium">Upcoming viewings</th>
                  <th className="px-3 py-3 font-medium">Last activity</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((client) => (
                  <tr key={client.customerId}>
                    <td className="px-5 py-3 font-medium">{client.customerName}</td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-muted">{client.latestListingTitle}</td>
                    <td className="px-3 py-3">
                      <Badge>{INQUIRY_STATUS_LABEL[client.latestStatus]}</Badge>
                    </td>
                    <td className="tabular px-3 py-3">
                      {client.openInquiries} / {client.totalInquiries}
                    </td>
                    <td className="tabular px-3 py-3">{client.upcomingViewings}</td>
                    <td className="px-3 py-3 text-muted">{formatDateTime(client.lastActivityAt)}</td>
                    <td className="px-5 py-3 text-right">
                      {client.latestConversationId ? (
                        <LinkBtn href={`/agent/messages?c=${client.latestConversationId}`} size="sm" variant="outline">
                          <MessageSquare className="size-3.5" aria-hidden /> Message
                        </LinkBtn>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Card>
    </Page>
  );
}
