"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useStore } from "zustand";
import { ImagePlus, Trash2, Building2 } from "lucide-react";
import type { Workspace } from "@/domain/workspace/workspace";
import { workspaceHome } from "@/domain/workspace/workspace";
import { createPartnerShellStore } from "@/stores/partner-shell-store";
import { Photo } from "./photo";
import { Btn, Card } from "./ui";
const Context = createContext<ReturnType<
  typeof createPartnerShellStore
> | null>(null);
export function PartnerBrandingProvider({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: ReactNode;
}) {
  const { kind, key, title, subtitle, verified } = workspace;
  const organizationId =
    workspace.kind === "OWNER" ? workspace.organizationId : "";
  const agentId = workspace.kind === "AGENT" ? workspace.agentId : "";
  const current = useMemo(
    () =>
      createPartnerShellStore(
        kind === "OWNER"
          ? { kind, key, title, subtitle, verified, organizationId }
          : { kind, key: "agent", title, subtitle, verified, agentId },
      ),
    [kind, key, title, subtitle, verified, organizationId, agentId],
  );
  useEffect(() => {
    void current.getState().loadBranding();
    return () => current.getState().dispose();
  }, [current]);
  return <Context.Provider value={current}>{children}</Context.Provider>;
}
export function usePartnerShell() {
  const store = useContext(Context);
  if (!store) throw new Error("Partner workspace is required.");
  return useStore(store);
}
export function PartnerLogo({ workspace }: { workspace: Workspace }) {
  const { branding } = usePartnerShell();
  return (
    <span className="partner-logo">
      {branding?.logo ? (
        <Photo
          src={branding.logo}
          alt={`${workspace.title} logo`}
          className="size-full"
          sizes="48px"
        />
      ) : (
        <Building2 size={24} aria-hidden />
      )}
    </span>
  );
}
export function PartnerBrand({
  workspace,
  drawer = false,
  onNavigate,
}: {
  workspace: Workspace;
  drawer?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={workspaceHome(workspace)}
      className={drawer ? "partner-drawer-brand focusable" : "partner-brand focusable"}
      aria-label={`${workspace.title} workspace home`}
      onClick={onNavigate}
    >
      <PartnerLogo workspace={workspace} />
      <span className="partner-brand-copy">
        <span className="partner-wordmark" title={workspace.title}>{workspace.title}</span>
        <span className="partner-brand-subtitle">
          {workspace.kind === "AGENT" ? "Agent workspace" : workspace.subtitle}
        </span>
      </span>
    </Link>
  );
}

export function PartnerBrandingEditor() {
  const {
      branding: value,
      brandingBusy: busy,
      brandingLoading: loading,
      brandingError: error,
      brandingSuccess,
      upload,
      remove,
      loadBranding,
    } = usePartnerShell(),
    input = useRef<HTMLInputElement>(null);
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-semibold">Workspace logo</h2>
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <span className="partner-logo partner-logo-preview">
            {value?.logo ? (
              <Photo
                src={value.logo}
                alt="Current workspace logo"
                className="size-full"
                sizes="72px"
              />
            ) : (
              <Building2 aria-hidden />
            )}
          </span>
          <p className="text-sm text-muted">
            Add your partner brand to this workspace. JPEG, PNG or WebP up to 2
            MiB.
          </p>
        </div>
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Choose workspace logo"
          disabled={busy || !value?.canEdit}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
        {loading ? (
          <p role="status" className="mt-3 text-sm">
            Loading workspace branding…
          </p>
        ) : value?.canEdit ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <Btn
              variant="outline"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              <ImagePlus size={16} aria-hidden />
              {busy ? "Saving…" : value.logo ? "Replace logo" : "Upload logo"}
            </Btn>
            {value.logo ? (
              <Btn
                variant="outline"
                disabled={busy}
                onClick={() => void remove()}
              >
                <Trash2 size={16} aria-hidden />
                Remove logo
              </Btn>
            ) : null}
          </div>
        ) : !error ? (
          <p className="mt-3 text-sm text-muted">
            Only the workspace owner can change this logo.
          </p>
        ) : null}
        {error ? (
          <div role="alert" className="mt-3 text-sm text-red-700">
            {error}
            <button
              className="ml-3 underline"
              onClick={() => void loadBranding()}
              disabled={busy}
            >
              Try again
            </button>
          </div>
        ) : null}
        <p role="status" className="mt-3 text-sm">
          {brandingSuccess}
        </p>
      </Card>
    </section>
  );
}
