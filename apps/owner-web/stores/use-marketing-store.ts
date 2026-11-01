import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import { useSessionStore } from "./use-session-store";
import {
  emptyMarketingDraft,
  type MarketingDraft,
  type MarketingDraftInput,
  type MarketingSnapshot,
} from "../domain/marketing/marketing";
interface MarketingState {
  scope: string | null;
  snapshot: MarketingSnapshot | null;
  loading: boolean;
  busy: boolean;
  problem: string | null;
  notice: string | null;
  editor: MarketingDraftInput;
  editingId: string | undefined;
  version: number | undefined;
  editorOpen: boolean;
  preview: { url: string; contentType: string; fileName: string } | null;
  setScope: (scope: string | null) => void;
  load: () => Promise<void>;
  edit: (draft?: MarketingDraft) => void;
  closeEditor: () => void;
  field: <K extends keyof MarketingDraftInput>(
    key: K,
    value: MarketingDraftInput[K],
  ) => void;
  save: () => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  removeDraft: (id: string) => Promise<void>;
  upload: (file: File) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  readMedia: (id: string) => Promise<void>;
  closePreview: () => void;
}
export const useMarketingStore = create<MarketingState>((set, get) => {
  let epoch = 0;
  let loadSequence = 0;
  const message = (error: unknown) =>
    error instanceof Error
      ? error.message
      : "The request did not finish. Please try again.";
  const load = async () => {
    const scope = get().scope,
      token = epoch;
    const request = ++loadSequence;
    if (!scope) return;
    set({ loading: true, problem: null });
    try {
      const snapshot = await container.marketing.load();
      if (epoch === token && request === loadSequence && get().scope === scope)
        set({ snapshot, loading: false });
    } catch (error) {
      if (epoch === token && request === loadSequence)
        set({ problem: message(error), loading: false });
    }
  };
  const action = async (work: () => Promise<void>) => {
    if (!get().scope || get().busy) return;
    const token = epoch;
    set({ busy: true, problem: null, notice: null });
    try {
      await work();
      if (epoch === token) await load();
    } catch (error) {
      if (epoch === token) {
        const problem = message(error);
        await load();
        if (epoch === token) set({ problem });
      }
    } finally {
      if (epoch === token) set({ busy: false });
    }
  };
  return {
    scope: null,
    snapshot: null,
    loading: false,
    busy: false,
    problem: null,
    notice: null,
    editor: emptyMarketingDraft(),
    editingId: undefined,
    version: undefined,
    editorOpen: false,
    preview: null,
    setScope(scope) {
      if (scope === get().scope) return;
      epoch++;
      set({
        scope,
        snapshot: null,
        loading: false,
        busy: false,
        problem: null,
        notice: null,
        editor: emptyMarketingDraft(),
        editingId: undefined,
        version: undefined,
        editorOpen: false,
        preview: null,
      });
    },
    load,
    edit(draft) {
      set({
        editor: draft
          ? {
              title: draft.title,
              caption: draft.caption,
              listingId: draft.listingId,
              sourcePhotos: draft.sourcePhotos,
              mediaIds: draft.mediaIds,
              state: draft.state,
            }
          : emptyMarketingDraft(),
        editingId: draft?.id,
        version: draft?.version,
        editorOpen: true,
        problem: null,
        notice: null,
      });
    },
    closeEditor() {
      set({ editorOpen: false });
    },
    field(key, value) {
      set({ editor: { ...get().editor, [key]: value } });
    },
    save() {
      return action(async () => {
        const { editor, editingId, version } = get(),
          token = epoch;
        const saved = await container.marketing.save(
          editor,
          editingId,
          version,
        );
        if (epoch === token)
          set({
            editorOpen: false,
            notice: "Draft saved.",
            editingId: saved.id,
            version: saved.version,
          });
      });
    },
    duplicate(id) {
      return action(async () => {
        await container.marketing.duplicate(id);
      });
    },
    removeDraft(id) {
      return action(async () => {
        await container.marketing.removeDraft(id);
      });
    },
    upload(file) {
      return action(async () => {
        await container.marketing.upload(file);
      });
    },
    removeMedia(id) {
      return action(async () => {
        await container.marketing.removeMedia(id);
      });
    },
    async readMedia(id) {
      const token = epoch,
        media = get().snapshot?.media.find((m) => m.id === id);
      if (!get().scope || !media) return;
      try {
        const result = await container.marketing.readMedia(id);
        if (epoch === token)
          set({
            preview: {
              url: result.url,
              contentType: media.contentType,
              fileName: media.fileName,
            },
            problem: null,
          });
      } catch (error) {
        if (epoch === token) set({ problem: message(error) });
      }
    },
    closePreview() {
      set({ preview: null });
    },
  };
});
useSessionStore.subscribe((state, previous) => {
  if (
    state.status !== "authenticated" ||
    state.user?.id !== previous.user?.id ||
    state.activeWorkspace?.key !== previous.activeWorkspace?.key
  )
    useMarketingStore.getState().setScope(null);
});
