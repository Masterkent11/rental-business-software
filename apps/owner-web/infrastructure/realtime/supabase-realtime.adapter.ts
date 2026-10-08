import type { RealtimePort, RealtimeStatus, Unsubscribe } from "../../application/ports/realtime.port";
import type { Message, SenderRole } from "../../domain/messaging/conversation";
import type { AppNotification, NotificationKind } from "../../domain/notifications/notification";
import type { PartnerScope } from "../../domain/workspace/workspace";
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

type Channel = ReturnType<ReturnType<typeof supabaseBrowserClient>["channel"]>;

function connect(channel: Channel, onStatus?: (status: RealtimeStatus) => void): Unsubscribe {
  const client = supabaseBrowserClient();
  let cancelled = false;
  onStatus?.("connecting");
  void client.auth.getSession().then(({ data }) => {
    if (cancelled) return;
    if (data.session) client.realtime.setAuth(data.session.access_token);
    channel.subscribe((status) => {
      if (cancelled) return;
      if (status === "SUBSCRIBED") onStatus?.("live");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") onStatus?.("offline");
    });
  });
  return () => {
    cancelled = true;
    void client.removeChannel(channel);
  };
}

const scopeKey = (scope: PartnerScope) => (scope.kind === "OWNER" ? `org:${scope.organizationId}` : `agent:${scope.agentId}`);

export class SupabaseRealtimeAdapter implements RealtimePort {
  watchMessages(
    scope: PartnerScope,
    onMessage: (message: Message) => void,
    onStatus: (status: RealtimeStatus) => void,
  ): Unsubscribe {
    const filter = scope.kind === "OWNER" ? { filter: `organization_id=eq.${scope.organizationId}` } : {};
    const channel = supabaseBrowserClient()
      .channel(`messages:${scopeKey(scope)}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", ...filter }, (payload) => {
        const row = payload.new as MessageRow;
        onMessage({
          id: row.id,
          conversationId: row.conversation_id,
          senderRole: row.sender_role,
          body: row.body,
          clientId: row.client_id,
          createdAt: new Date(row.created_at).toISOString(),
        });
      });
    return connect(channel, onStatus);
  }

  watchNotifications(
    scope: PartnerScope,
    userId: string,
    onNotification: (notification: AppNotification) => void,
  ): Unsubscribe {
    const filter = scope.kind === "OWNER" ? `organization_id=eq.${scope.organizationId}` : `user_id=eq.${userId}`;
    const channel = supabaseBrowserClient()
      .channel(`notifications:${scopeKey(scope)}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter }, (payload) => {
        const row = payload.new as NotificationRow;
        if (scope.kind === "OWNER" && row.user_id) return;
        onNotification({
          id: row.id,
          kind: row.kind,
          title: row.title,
          body: row.body,
          link: row.link,
          readAt: row.read_at,
          createdAt: new Date(row.created_at).toISOString(),
        });
      });
    return connect(channel);
  }

  watchActivity(scope: PartnerScope, onChange: (table: "inquiries" | "viewings") => void): Unsubscribe {
    const filter = scope.kind === "OWNER" ? `organization_id=eq.${scope.organizationId}` : `agent_id=eq.${scope.agentId}`;
    const channel = supabaseBrowserClient()
      .channel(`activity:${scopeKey(scope)}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inquiries", filter }, () => onChange("inquiries"))
      .on("postgres_changes", { event: "*", schema: "public", table: "viewings", filter }, () => onChange("viewings"));
    return connect(channel);
  }
}
