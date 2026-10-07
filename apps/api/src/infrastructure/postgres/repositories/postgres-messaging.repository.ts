import type postgres from 'postgres';
import type {
  ConversationContext,
  MessagingRepository,
} from '@/application/ports/repositories/messaging-repository.port.ts';
import type {
  Conversation,
  Message,
  ParticipantRole,
} from '@/domain/messaging/conversation.ts';
import { sql, withScope, withUser } from '@/infrastructure/postgres/db.ts';

type Scope = { readonly customerId: string } | { readonly organizationId: string };

interface ConversationRow {
  id: string;
  organization_id: string;
  organization_name: string;
  listing_id: string;
  listing_title: string;
  listing_photo: string | null;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  occupancy_id: string | null;
  booking_starts_on: string | null;
  booking_ends_on: string | null;
  last_message_at: Date | null;
  last_message_preview: string;
  last_sender_role: ParticipantRole | null;
  customer_last_read_at: Date | null;
  owner_last_read_at: Date | null;
  unread_count: number;
  created_at: Date;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: ParticipantRole;
  body: string;
  client_id: string;
  created_at: Date;
}

const toConversation = (row: ConversationRow): Conversation => ({
  id: row.id,
  organizationId: row.organization_id,
  organizationName: row.organization_name,
  listingId: row.listing_id,
  listingTitle: row.listing_title,
  listingPhoto: row.listing_photo,
  customerId: row.customer_id,
  customerName: row.customer_name?.trim() || row.customer_email?.split('@')[0] || 'Guest',
  occupancyId: row.occupancy_id,
  bookingStartsOn: row.booking_starts_on,
  bookingEndsOn: row.booking_ends_on,
  lastMessageAt: row.last_message_at,
  lastMessagePreview: row.last_message_preview,
  lastSenderRole: row.last_sender_role,
  customerLastReadAt: row.customer_last_read_at,
  ownerLastReadAt: row.owner_last_read_at,
  unreadCount: row.unread_count,
  createdAt: row.created_at,
});

const toMessage = (row: MessageRow): Message => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  senderRole: row.sender_role,
  body: row.body,
  clientId: row.client_id,
  createdAt: row.created_at,
});

const SELECT_CONVERSATION = (tx: postgres.TransactionSql, reader: ParticipantRole) => tx`
  select
    c.id, c.organization_id, o.trading_name as organization_name,
    c.listing_id, l.title as listing_title,
    (select m.storage_url from media_assets m
      where m.listing_id = l.id and m.kind = 'PHOTO'
      order by m.position limit 1) as listing_photo,
    c.customer_id, u.display_name as customer_name, u.email as customer_email,
    c.occupancy_id,
    to_char(lower(oc.during), 'YYYY-MM-DD') as booking_starts_on,
    to_char(upper(oc.during), 'YYYY-MM-DD') as booking_ends_on,
    c.last_message_at, c.last_message_preview, c.last_sender_role,
    c.customer_last_read_at, c.owner_last_read_at,
    (select count(*)::int from messages mm
      where mm.conversation_id = c.id
        and mm.sender_role <> ${reader}
        and mm.created_at > coalesce(
          ${reader === 'CUSTOMER' ? tx`c.customer_last_read_at` : tx`c.owner_last_read_at`},
          '-infinity'::timestamptz)) as unread_count,
    c.created_at
  from conversations c
  join organizations o on o.id = c.organization_id
  join listings l on l.id = c.listing_id
  left join user_profiles u on u.id = c.customer_id
  left join occupancies oc on oc.id = c.occupancy_id
`;

function inScope<T>(scope: Scope, work: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return 'customerId' in scope
    ? withUser(scope.customerId, work)
    : withScope(scope.organizationId, work);
}

export const postgresMessagingRepository = (): MessagingRepository => ({
  async listingContext(listingId): Promise<ConversationContext | null> {
    return sql.begin(async (tx) => {
      const [row] = await tx<{ id: string; organization_id: string; title: string; state: string }[]>`
        select id, organization_id, title, state from listings where id = ${listingId} and state = 'PUBLISHED'
      `;
      if (!row) return null;
      return {
        listingId: row.id,
        organizationId: row.organization_id,
        listingTitle: row.title,
        listingPublished: row.state === 'PUBLISHED',
      };
    });
  },

  async customerHasBookingFor(customerId, listingId, occupancyId) {
    return withUser(customerId, async (tx) => {
      const [row] = await tx<{ ok: boolean }[]>`
        select exists (
          select 1 from occupancies o
            join listings l on l.resource_id = o.resource_id
           where o.id = ${occupancyId}
             and o.held_by = ${customerId}
             and l.id = ${listingId}
        ) as ok
      `;
      return row?.ok === true;
    });
  },

  async openForCustomer(input) {
    return withUser(input.customerId, async (tx) => {
      await tx`
        insert into conversations (organization_id, listing_id, customer_id, occupancy_id)
        values (${input.organizationId}, ${input.listingId}, ${input.customerId}, ${input.occupancyId})
        on conflict (listing_id, customer_id) do update
          set occupancy_id = coalesce(excluded.occupancy_id, conversations.occupancy_id)
      `;
      const [row] = await tx<ConversationRow[]>`
        ${SELECT_CONVERSATION(tx, 'CUSTOMER')}
        where c.listing_id = ${input.listingId} and c.customer_id = ${input.customerId}
      `;
      return toConversation(row!);
    });
  },

  async findForCustomer(customerId, conversationId) {
    return withUser(customerId, async (tx) => {
      const [row] = await tx<ConversationRow[]>`
        ${SELECT_CONVERSATION(tx, 'CUSTOMER')}
        where c.id = ${conversationId} and c.customer_id = ${customerId}
      `;
      return row ? toConversation(row) : null;
    });
  },

  async findForOrganization(organizationId, conversationId) {
    return withScope(organizationId, async (tx) => {
      const [row] = await tx<ConversationRow[]>`
        ${SELECT_CONVERSATION(tx, 'OWNER')}
        where c.id = ${conversationId} and c.organization_id = ${organizationId}
      `;
      return row ? toConversation(row) : null;
    });
  },

  async listForCustomer(customerId) {
    return withUser(customerId, async (tx) => {
      const rows = await tx<ConversationRow[]>`
        ${SELECT_CONVERSATION(tx, 'CUSTOMER')}
        where c.customer_id = ${customerId}
        order by coalesce(c.last_message_at, c.created_at) desc
        limit 100
      `;
      return rows.map(toConversation);
    });
  },

  async listForOrganization(organizationId) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<ConversationRow[]>`
        ${SELECT_CONVERSATION(tx, 'OWNER')}
        where c.organization_id = ${organizationId}
          and c.last_message_at is not null
        order by c.last_message_at desc
        limit 200
      `;
      return rows.map(toConversation);
    });
  },

  async messages({ conversationId, scope, before, limit }) {
    return inScope(scope, async (tx) => {
      const rows = await tx<MessageRow[]>`
        select id, conversation_id, sender_id, sender_role, body, client_id, created_at
          from messages
         where conversation_id = ${conversationId}
           ${before ? tx`and created_at < ${before}` : tx``}
         order by created_at desc, id desc
         limit ${limit}
      `;
      return rows.reverse().map(toMessage);
    });
  },

  async append(input) {
    return inScope(input.scope, async (tx) => {
      const inserted = await tx<MessageRow[]>`
        insert into messages (organization_id, conversation_id, sender_id, sender_role, body, client_id)
        values (${input.conversation.organizationId}, ${input.conversation.id}, ${input.senderId},
                ${input.senderRole}, ${input.body}, ${input.clientId})
        on conflict (conversation_id, client_id) do nothing
        returning id, conversation_id, sender_id, sender_role, body, client_id, created_at
      `;
      if (inserted.length === 0) {
        const [existing] = await tx<MessageRow[]>`
          select id, conversation_id, sender_id, sender_role, body, client_id, created_at
            from messages
           where conversation_id = ${input.conversation.id} and client_id = ${input.clientId}
        `;
        return { message: toMessage(existing!), created: false };
      }

      const message = inserted[0]!;
      await tx`
        update conversations
           set last_message_at = ${message.created_at},
               last_message_preview = ${input.preview},
               last_sender_role = ${input.senderRole},
               customer_last_read_at = case when ${input.senderRole} = 'CUSTOMER' then ${message.created_at}::timestamptz else customer_last_read_at end,
               owner_last_read_at = case when ${input.senderRole} = 'OWNER' then ${message.created_at}::timestamptz else owner_last_read_at end
         where id = ${input.conversation.id}
      `;
      return { message: toMessage(message), created: true };
    });
  },

  async markRead({ conversationId, role, scope }) {
    await inScope(scope, async (tx) => {
      if (role === 'CUSTOMER') {
        await tx`update conversations set customer_last_read_at = now() where id = ${conversationId}`;
      } else {
        await tx`update conversations set owner_last_read_at = now() where id = ${conversationId}`;
      }
    });
  },
});
