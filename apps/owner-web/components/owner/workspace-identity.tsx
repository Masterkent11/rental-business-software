import type { Workspace } from "@/domain/workspace/workspace";

export function WorkspaceIdentity({ workspace }: { workspace: Workspace }) {
  return (
    <div className="workspace-choice-single" aria-label="Current workspace">
      <span className="workspace-choice-copy">
        <strong>
          {workspace.kind === "AGENT" ? "Agent workspace" : workspace.title}
        </strong>
        <small>
          {workspace.kind === "AGENT"
            ? "Your private workspace"
            : workspace.subtitle}
        </small>
      </span>
    </div>
  );
}
