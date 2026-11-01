import { createStore } from "zustand/vanilla";
import type { Workspace } from "../domain/workspace/workspace";
import type {
  PartnerBranding,
  PartnerSearchResult,
} from "../domain/workspace/partner-shell";
import { navigationMatches } from "../domain/workspace/partner-shell";
import type { PartnerShellUseCases } from "../application/use-cases/partner/partner-shell.use-cases";
import { container } from "../infrastructure/composition/owner-web-container";
export interface PartnerShellState {
  branding: PartnerBranding | null;
  brandingError: string | null;
  brandingBusy: boolean;
  brandingLoading: boolean;
  brandingSuccess: string;
  query: string;
  results: readonly PartnerSearchResult[];
  searchBusy: boolean;
  searchError: string;
  searchOpen: boolean;
  activeResult: number;
  loadBranding: () => Promise<void>;
  upload: (file: File) => Promise<boolean>;
  remove: () => Promise<boolean>;
  search: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  setActiveResult: (index: number) => void;
  dispose: () => void;
}
export function createPartnerShellStore(
  workspace: Workspace,
  actions: PartnerShellUseCases = container.partnerShell,
) {
  let disposed = false,
    brandingRevision = 0,
    searchRevision = 0,
    brandingRead: AbortController | undefined,
    searchRead: AbortController | undefined,
    timer: ReturnType<typeof setTimeout> | undefined;
  return createStore<PartnerShellState>((set, get) => {
    async function change(file: File | null) {
      if (get().brandingBusy) return false;
      const revision = ++brandingRevision;
      brandingRead?.abort();
      set({ brandingBusy: true, brandingError: null, brandingSuccess: "" });
      try {
        const branding = file
          ? await actions.upload(workspace, file)
          : await actions.remove(workspace);
        if (disposed || revision !== brandingRevision) return false;
        set({
          branding,
          brandingSuccess: file
            ? "Workspace logo saved."
            : "Workspace logo removed.",
        });
        return true;
      } catch (error) {
        if (!disposed && revision === brandingRevision)
          set({
            brandingError:
              error instanceof Error
                ? error.message
                : "Unable to save the logo.",
          });
        return false;
      } finally {
        if (!disposed && revision === brandingRevision)
          set({ brandingBusy: false, brandingLoading: false });
      }
    }
    return {
      branding: null,
      brandingError: null,
      brandingBusy: false,
      brandingLoading: true,
      brandingSuccess: "",
      query: "",
      results: [],
      searchBusy: false,
      searchError: "",
      searchOpen: false,
      activeResult: -1,
      async loadBranding() {
        disposed = false;
        const revision = ++brandingRevision;
        brandingRead?.abort();
        const controller = new AbortController();
        brandingRead = controller;
        set({ brandingLoading: true, brandingError: null });
        try {
          const branding = await actions.branding(workspace, controller.signal);
          if (
            !disposed &&
            !controller.signal.aborted &&
            revision === brandingRevision
          )
            set({ branding });
        } catch (error) {
          if (
            !disposed &&
            !controller.signal.aborted &&
            revision === brandingRevision
          )
            set({
              brandingError:
                error instanceof Error
                  ? error.message
                  : "Unable to load workspace branding.",
            });
        } finally {
          if (!disposed && revision === brandingRevision)
            set({ brandingLoading: false });
        }
      },
      upload: (file) => change(file),
      remove: () => change(null),
      search(query) {
        const revision = ++searchRevision;
        searchRead?.abort();
        clearTimeout(timer);
        const normalized = query.trim().replace(/\s+/g, " "),
          pages = navigationMatches(workspace, normalized);
        set({
          query,
          results: pages,
          searchBusy: normalized.length >= 2,
          searchError: "",
          activeResult: -1,
          searchOpen: true,
        });
        if (normalized.length < 2) return;
        const controller = new AbortController();
        searchRead = controller;
        timer = setTimeout(() => {
          void actions
            .search(workspace, normalized, controller.signal)
            .then((items) => {
              if (
                !disposed &&
                !controller.signal.aborted &&
                revision === searchRevision
              )
                set({ results: [...items, ...pages] });
            })
            .catch((error) => {
              if (
                !disposed &&
                !controller.signal.aborted &&
                revision === searchRevision
              )
                set({
                  searchError:
                    error instanceof Error
                      ? error.message
                      : "Search is unavailable.",
                });
            })
            .finally(() => {
              if (!disposed && revision === searchRevision)
                set({ searchBusy: false });
            });
        }, 250);
      },
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setActiveResult: (activeResult) => set({ activeResult }),
      dispose() {
        disposed = true;
        brandingRevision++;
        searchRevision++;
        brandingRead?.abort();
        searchRead?.abort();
        clearTimeout(timer);
        set({
          branding: null,
          brandingError: null,
          brandingSuccess: "",
          brandingBusy: false,
          query: "",
          results: [],
          searchError: "",
          searchBusy: false,
          searchOpen: false,
          activeResult: -1,
        });
      },
    };
  });
}
