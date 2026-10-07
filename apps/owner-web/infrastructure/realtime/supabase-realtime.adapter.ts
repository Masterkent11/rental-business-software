import type { RealtimePort, RealtimeStatus, Unsubscribe } from "../../application/ports/realtime.port";
import type { Message, SenderRole } from "../../domain/messaging/conversation";
import type { AppNotification, NotificationKind } from "../../domain/notifications/notification";
import { supabaseBrowserClient } from "../supabase/browser-client";

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_role: SenderRole;
  body: string;
  client_id: string;
  created_at: string;
}

interface NotificationRow {
  id: string;
  user_id: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export class SupabaseRealtimeAdapter implements RealtimePort {
  watchOrganizationMessages(
    organizationId: string,
    onMessage: (message: Message) => void,
    onStatus: (status: RealtimeStatus) => void,
  ): Unsubscribe {
    const client = supabaseBrowserClient();
    let cancelled = false;
    onStatus("connecting");

    const channel = client
      .channel(`org-messages:${organizationId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `organization_id=eq.${organizationId}` },
        (payload) => {
          const row = payload.new as MessageRow;
          onMessage({
            id: row.id,
            conversationId: row.conversation_id,
            senderRole: row.sender_role,
            body: row.body,
            clientId: row.client_id,
            createdAt: new Date(row.created_at).toISOString(),
          });
        },
      );

    void client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) client.realtime.setAuth(data.session.access_token);
      channel.subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") onStatus("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") onStatus("offline");
      });
    });

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }

  watchOrganizationNotifications(
    organizationId: string,
    onNotification: (notification: AppNotification) => void,
  ): Unsubscribe {
    const client = supabaseBrowserClient();
    let cancelled = false;
    const channel = client
      .channel(`org-notifications:${organizationId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `organization_id=eq.${organizationId}` },
        (payload) => {
          const row = payload.new as NotificationRow;
          if (row.user_id) return;
          onNotification({
            id: row.id,
            kind: row.kind,
            title: row.title,
            body: row.body,
            link: row.link,
            readAt: row.read_at,
            createdAt: new Date(row.created_at).toISOString(),
          });
        },
      );

    void client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) client.realtime.setAuth(data.session.access_token);
      channel.subscribe();
    });

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }
}
