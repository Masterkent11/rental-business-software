"use client";

import { useRouter } from "next/navigation";
import { BriefcaseBusiness } from "lucide-react";

import { Btn, Card, Field, InlineError, TextInput } from "@/components/owner/ui";
import { useAgentStore } from "@/stores/use-agent-store";
import { useSessionStore } from "@/stores/use-session-store";

export function AgentSetupCard() {
  const router = useRouter();
  const { form, formErrors, saving, saveError, setFormField, saveProfile } = useAgentStore();
  const user = useSessionStore((s) => s.user);
  const reload = useSessionStore((s) => s.reload);
  const setWorkspace = useSessionStore((s) => s.setWorkspace);

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-muted">
          <BriefcaseBusiness className="size-5" aria-hidden />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold">Work as an agent</h3>
          <p className="mt-1 text-[13px] text-muted">
            Create an agent profile to represent properties, answer buyer inquiries and run viewings. Owners invite you to their listings. Verification is done by the platform team after you add your license.
          </p>
        </div>
      </div>
      <form
        noValidate
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const profile = await saveProfile();
          if (!profile) return;
          await reload();
          setWorkspace("agent");
          router.push("/agent/profile");
        }}
      >
        <Field label="Display name" htmlFor="agentDisplayName" error={formErrors.displayName}>
          <TextInput
            id="agentDisplayName"
            value={form.displayName || user?.displayName || ""}
            error={formErrors.displayName}
            onChange={(e) => setFormField("displayName", e.target.value)}
            maxLength={80}
          />
        </Field>
        <Field label="Headline" htmlFor="agentHeadline" error={formErrors.headline}>
          <TextInput id="agentHeadline" value={form.headline} error={formErrors.headline} onChange={(e) => setFormField("headline", e.target.value)} maxLength={80} />
        </Field>
        <div className="sm:col-span-2">
          <InlineError message={saveError} />
        </div>
        <div className="sm:col-span-2">
          <Btn
            type="submit"
            busy={saving}
            onClick={() => {
              if (!form.displayName && user?.displayName) setFormField("displayName", user.displayName);
            }}
          >
            Create agent profile
          </Btn>
        </div>
      </form>
    </Card>
  );
}
