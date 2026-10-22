import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { RealtimeStatus } from "../application/ports/realtime.port";
import type { PartnerScope } from "../domain/workspace/workspace";
import {
  mergeMessages,
  type ChatMessage,
  type Conversation,
  type Message,
} from "../domain/messaging/conversation";

interface MessagesState {
  scope: PartnerScope | null;
  conversations: readonly Conversation[];
  unreadTotal: number;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  activeId: string | null;
  activeConversation: Conversation | null;
  thread: readonly ChatMessage[];
  threadLoading: boolean;
  threadError: string | null;
  hasMore: boolean;
  loadingOlder: boolean;
  composer: string;
  realtime: RealtimeStatus;
  lastIncoming: Message | null;
  unsubscribe: (() => void) | null;

  start: (scope: PartnerScope) => Promise<void>;
  stop: () => void;
  refresh: () => Promise<void>;
  open: (conversationId: string) => Promise<void>;
  close: () => void;
  loadOlder: () => Promise<void>;
  setComposer: (value: string) => void;
  send: () => Promise<void>;
  retry: (clientId: string) => Promise<void>;
  receive: (message: Message) => void;
}

const sameScope = (a: PartnerScope | null, b: PartnerScope) =>
  a !== null &&
  a.kind === b.kind &&
  (a.kind === "OWNER" ? a.organizationId === (b as { organizationId: string }).organizationId : a.agentId === (b as { agentId: string }).agentId);

const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const RECENT_MESSAGE_LIMIT = 500;
const receivedIds = new Set<string>();
let lifetime = 0;
let refreshRequest = 0;
let threadRequest = 0;

export const useMessagesStore = create<MessagesState>((set, get) => ({
  scope: null,
  conversations: [],
  unreadTotal: 0,
  loading: false,
  loaded: false,
  error: null,
  activeId: null,
  activeConversation: null,
  thread: [],
  threadLoading: false,
  threadError: null,
  hasMore: false,
  loadingOlder: false,
  composer: "",
  realtime: "connecting",
  lastIncoming: null,
  unsubscribe: null,

  start: async (scope) => {
    if (sameScope(get().scope, scope) && get().unsubscribe) return;
    get().stop();
    const generation = lifetime;
    set({ scope, conversations: [], unreadTotal: 0, loaded: false, activeId: null, thread: [] });
    const unsubscribe = container.watchMessagesUseCase.execute(
      scope,
      (message) => { if (generation === lifetime) get().receive(message); },
      (status) => {
        if (generation !== lifetime) return;
        const previous = get().realtime;
        set({ realtime: status });
        if (status === "live" && previous === "offline") void get().refresh();
      },
    );
    set({ unsubscribe });
    await get().refresh();
  },

  stop: () => {
    receivedIds.clear();
    ++lifetime;
    ++refreshRequest;
    ++threadRequest;
    get().unsubscribe?.();
    set({ unsubscribe: null, scope: null, realtime: "connecting", conversations: [], unreadTotal: 0, loading: false, loaded: false, error: null, activeId: null, activeConversation: null, thread: [], threadLoading: false, threadError: null, hasMore: false, loadingOlder: false, composer: "", lastIncoming: null });
  },

  refresh: async () => {
    const generation = lifetime;
    const version = ++refreshRequest;
    const scope = get().scope;
    if (!scope) return;
    set({ loading: !get().loaded, error: null });
    try {
      const result = await container.loadConversationsUseCase.execute(scope);
      if (generation !== lifetime || version !== refreshRequest || !sameScope(get().scope, scope)) return;
      set({ conversations: result.conversations, unreadTotal: result.unreadTotal, loading: false, loaded: true });
      const activeId = get().activeId;
      const selectedVersion = threadRequest;
      if (activeId) {
        const thread = await container.loadThreadUseCase.execute(scope, activeId);
        if (generation !== lifetime || version !== refreshRequest || selectedVersion !== threadRequest || !sameScope(get().scope, scope) || get().activeId !== activeId) return;
        set((state) => ({ thread: mergeMessages(state.thread, thread.messages), activeConversation: thread.conversation }));
      }
    } catch (error) {
      if (generation !== lifetime || version !== refreshRequest || !sameScope(get().scope, scope)) return;
      set({ loading: false, error: messageOf(error, "Could not load conversations") });
    }
  },

  open: async (conversationId) => {
    const generation = lifetime;
    const version = ++threadRequest;
    const scope = get().scope;
    if (!scope) return;
    const known = get().conversations.find((c) => c.id === conversationId) ?? null;
    set({
      activeId: conversationId,
      activeConversation: known,
      thread: [],
      threadLoading: true,
      threadError: null,
      hasMore: false,
      composer: "",
    });
    try {
      const page = await container.loadThreadUseCase.execute(scope, conversationId);
      if (generation !== lifetime || version !== threadRequest || get().activeId !== conversationId) return;
      set((state) => ({
        thread: mergeMessages(state.thread, page.messages),
        activeConversation: page.conversation,
        hasMore: page.hasMore,
        threadLoading: false,
      }));
      await container.markConversationReadUseCase.execute(scope, conversationId);
      if (generation !== lifetime || version !== threadRequest || get().activeId !== conversationId) return;
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
        unreadTotal: Math.max(0, state.unreadTotal - (state.conversations.find(c => c.id === conversationId)?.unreadCount ?? 0)),
      }));
    } catch (error) {
      if (generation !== lifetime || version !== threadRequest || get().activeId !== conversationId) return;
      set({ threadLoading: false, threadError: messageOf(error, "Could not load this conversation") });
    }
  },

  close: () => {
    ++threadRequest;
    set({ activeId: null, activeConversation: null, thread: [], composer: "", threadLoading: false, threadError: null, loadingOlder: false, hasMore: false });
  },

  loadOlder: async () => {
    const generation = lifetime;
    const version = threadRequest;
    const { scope, activeId, thread, hasMore } = get();
    if (!scope || !activeId || !hasMore || thread.length === 0) return;
    set({ loadingOlder: true });
    try {
      const page = await container.loadThreadUseCase.execute(scope, activeId, thread[0]!.createdAt);
      if (generation !== lifetime || version !== threadRequest || get().activeId !== activeId) return;
      set((state) => ({ thread: mergeMessages(state.thread, page.messages), hasMore: page.hasMore, loadingOlder: false }));
    } catch (error) {
      if (generation !== lifetime || version !== threadRequest || get().activeId !== activeId) return;
      set({ loadingOlder: false, threadError: messageOf(error, "Could not load earlier messages") });
    }
  },

  setComposer: (composer) => set({ composer }),

  send: async () => {
    const generation = lifetime;
    const { scope, activeId, composer } = get();
    const body = composer.trim();
    if (!scope || !activeId || !body) return;
    const clientId = crypto.randomUUID();
    const optimistic: ChatMessage = {
      id: `local-${clientId}`,
      conversationId: activeId,
      senderRole: scope.kind === "AGENT" ? "AGENT" : "OWNER",
      body,
      clientId,
      createdAt: new Date().toISOString(),
      delivery: "sending",
    };
    set((state) => ({ composer: "", thread: [...state.thread, optimistic] }));
    try {
      const saved = await container.sendMessageUseCase.execute(scope, activeId, body, clientId);
      if (generation !== lifetime) return;
      get().receive(saved);
    } catch {
      if (generation !== lifetime) return;
      set((state) => ({
        thread: state.thread.map((m) => (m.clientId === clientId ? { ...m, delivery: "failed" } : m)),
      }));
    }
  },

  retry: async (clientId) => {
    const generation = lifetime;
    const { scope, activeId } = get();
    const failed = get().thread.find((m) => m.clientId === clientId);
    if (!scope || !activeId || !failed) return;
    set((state) => ({
      thread: state.thread.map((m) => (m.clientId === clientId ? { ...m, delivery: "sending" } : m)),
    }));
    try {
      const saved = await container.sendMessageUseCase.execute(scope, activeId, failed.body, clientId);
      if (generation !== lifetime) return;
      get().receive(saved);
    } catch {
      if (generation !== lifetime) return;
      set((state) => ({
        thread: state.thread.map((m) => (m.clientId === clientId ? { ...m, delivery: "failed" } : m)),
      }));
    }
  },

  receive: (message) => {
    if (receivedIds.has(message.id)) return;
    receivedIds.add(message.id);
    if (receivedIds.size > RECENT_MESSAGE_LIMIT) receivedIds.delete(receivedIds.values().next().value!);
    const state = get();
    const isActive = state.activeId === message.conversationId;
    if (isActive) set({ thread: mergeMessages(state.thread, [message]) });
    if (message.senderRole === "CUSTOMER") set({ lastIncoming: message });

    const existing = state.conversations.find((c) => c.id === message.conversationId);
    if (!existing) {
      void get().refresh();
      return;
    }
    const isNewer = !existing.lastMessageAt || existing.lastMessageAt <= message.createdAt;
    const countsAsUnread = message.senderRole === "CUSTOMER" && !isActive;
    const updated: Conversation = {
      ...existing,
      lastMessageAt: isNewer ? message.createdAt : existing.lastMessageAt,
      lastMessagePreview: isNewer ? message.body.replace(/\s+/g, " ").slice(0, 140) : existing.lastMessagePreview,
      lastSenderRole: isNewer ? message.senderRole : existing.lastSenderRole,
      unreadCount: existing.unreadCount + (countsAsUnread ? 1 : 0),
    };
    set((current) => ({
      conversations: [updated, ...current.conversations.filter((c) => c.id !== updated.id)],
      unreadTotal: current.unreadTotal + (countsAsUnread ? 1 : 0),
    }));
    if (isActive && message.senderRole === "CUSTOMER" && state.scope) {
      void container.markConversationReadUseCase.execute(state.scope, message.conversationId);
    }
  },
}));
