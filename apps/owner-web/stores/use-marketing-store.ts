import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import { useSessionStore } from "./use-session-store";
import {
  emptyMarketingDraft,
  marketingDraftFormat,
  marketingMediaFormat,
  type MarketingDraft,
  type MarketingDraftInput,
  type MarketingFormat,
  type MarketingSnapshot,
} from "../domain/marketing/marketing";
interface MarketingState {
  scope: string | null;
  snapshot: MarketingSnapshot | null;
  loading: boolean;
  busy: boolean;
  uploading: boolean;
  problem: string | null;
  notice: string | null;
  editor: MarketingDraftInput;
  baseline: MarketingDraftInput;
  format: MarketingFormat;
  baselineFormat: MarketingFormat;
  editingId: string | undefined;
  version: number | undefined;
  editorOpen: boolean;
  setScope: (scope: string | null) => void;
  load: () => Promise<void>;
  edit: (draft?: MarketingDraft) => void;
  closeEditor: () => void;
  changeFormat: (format: MarketingFormat) => void;
  field: <K extends keyof MarketingDraftInput>(
    key: K,
    value: MarketingDraftInput[K],
  ) => void;
  save: () => Promise<boolean>;
  duplicate: (id: string) => Promise<void>;
  removeDraft: (id: string) => Promise<void>;
  upload: (file: File, attach?: boolean) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
}

export function isMarketingEditorDirty(state: MarketingState): boolean {
  return (
    state.editorOpen &&
    (state.format !== state.baselineFormat ||
      JSON.stringify(state.editor) !== JSON.stringify(state.baseline))
  );
}

const closedEditor = {
  editor: emptyMarketingDraft(),
  baseline: emptyMarketingDraft(),
  format: "photo" as const,
  baselineFormat: "photo" as const,
  editingId: undefined,
  version: undefined,
  editorOpen: false,
};

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
  const action = async (
    work: (isCurrent: () => boolean) => Promise<void>,
    uploading = false,
  ): Promise<boolean> => {
    if (!get().scope || get().busy) return false;
    const token = epoch;
    const isCurrent = () => token === epoch;
    set({ busy: true, uploading, problem: null, notice: null });
    try {
      await work(isCurrent);
      if (isCurrent()) await load();
      return isCurrent();
    } catch (error) {
      if (epoch === token) {
        const problem = message(error);
        await load();
        if (epoch === token) set({ problem });
      }
      return false;
    } finally {
      if (isCurrent()) set({ busy: false, uploading: false });
    }
  };
  return {
    scope: null,
    snapshot: null,
    loading: false,
    busy: false,
    uploading: false,
    problem: null,
    notice: null,
    ...closedEditor,
    setScope(scope) {
      if (scope === get().scope) return;
      epoch++;
      set({
        scope,
        snapshot: null,
        loading: false,
        busy: false,
        uploading: false,
        problem: null,
        notice: null,
        ...closedEditor,
      });
    },
    load,
    edit(draft) {
      const editor = draft
        ? {
            title: draft.title,
            caption: draft.caption,
            listingId: draft.listingId,
            sourcePhotos: draft.sourcePhotos,
            mediaIds: draft.mediaIds,
            state: draft.state,
          }
        : emptyMarketingDraft();
      const format = marketingDraftFormat(editor, get().snapshot?.media ?? []);
      set({
        editor,
        baseline: editor,
        format,
        baselineFormat: format,
        editingId: draft?.id,
        version: draft?.version,
        editorOpen: true,
        problem: null,
        notice: null,
      });
    },
    closeEditor() {
      set({ ...closedEditor });
    },
    changeFormat(format) {
      if (format === get().format) return;
      set({
        format,
        editor: { ...get().editor, mediaIds: [], sourcePhotos: [] },
      });
    },
    field(key, value) {
      set({ editor: { ...get().editor, [key]: value } });
    },
    save() {
      return action(async (isCurrent) => {
        const { editor, editingId, version } = get();
        const saved = await container.marketing.save(
          editor,
          editingId,
          version,
        );
        if (!isCurrent()) return;
        set(({ snapshot }) => ({
          baseline: editor,
          baselineFormat: get().format,
          version: saved.version,
          notice: "Draft saved.",
          snapshot: snapshot && {
            ...snapshot,
            drafts: [
              saved,
              ...snapshot.drafts.filter((draft) => draft.id !== saved.id),
            ],
          },
        }));
      });
    },
    async duplicate(id) {
      await action(async (isCurrent) => {
        await container.marketing.duplicate(id);
        if (isCurrent()) set({ notice: "Draft duplicated." });
      });
    },
    async removeDraft(id) {
      await action(async (isCurrent) => {
        await container.marketing.removeDraft(id);
        if (isCurrent()) set({ notice: "Draft deleted." });
      });
    },
    async upload(file, attach = false) {
      await action(async (isCurrent) => {
        const { editor, editorOpen, format } = get();
        if (
          attach &&
          (!editorOpen ||
            editor.mediaIds.length ||
            editor.sourcePhotos.length ||
            marketingMediaFormat(file.type) !== format)
        )
          throw new Error(
            "Choose a matching file after removing the current attachment.",
          );
        const asset = await container.marketing.upload(file);
        if (!isCurrent()) return;
        set(({ snapshot }) => ({
          snapshot: snapshot && {
            ...snapshot,
            media: [
              asset,
              ...snapshot.media.filter((entry) => entry.id !== asset.id),
            ],
          },
          ...(attach && get().editor === editor
            ? {
                editor: { ...editor, mediaIds: [asset.id] },
              }
            : {}),
          notice: attach ? "Media uploaded and attached." : "Media uploaded.",
        }));
      }, true);
    },
    async removeMedia(id) {
      await action(async (isCurrent) => {
        await container.marketing.removeMedia(id);
        if (isCurrent()) set({ notice: "Media removed." });
      });
    },
  };
});

function warnBeforeLeaving(event: BeforeUnloadEvent) {
  event.preventDefault();
  event.returnValue = true;
}

if (typeof window !== "undefined") {
  useMarketingStore.subscribe((state, previous) => {
    const protect = (value: MarketingState) =>
      isMarketingEditorDirty(value) || (value.editorOpen && value.busy);
    if (protect(state) === protect(previous)) return;
    if (protect(state))
      window.addEventListener("beforeunload", warnBeforeLeaving);
    else window.removeEventListener("beforeunload", warnBeforeLeaving);
  });
}
useSessionStore.subscribe((state, previous) => {
  if (
    state.status !== "authenticated" ||
    state.user?.id !== previous.user?.id ||
    state.activeWorkspace?.key !== previous.activeWorkspace?.key
  )
    useMarketingStore.getState().setScope(null);
});
