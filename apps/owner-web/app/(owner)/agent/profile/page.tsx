"use client";

import { useEffect } from "react";
import { BadgeCheck, CheckCircle2, ShieldAlert, X } from "lucide-react";

import { Page, SectionHeading, TopBar } from "@/components/owner/shell";
import { Badge, Btn, Card, Field, InlineError, Skeleton, TextArea, TextInput } from "@/components/owner/ui";
import { VERIFICATION_LABEL, canRequestVerification } from "@/domain/agents/agent";
import { useAgentStore } from "@/stores/use-agent-store";
import { useSessionStore } from "@/stores/use-session-store";

type ListKey = "specialties" | "areasServed" | "languages";

const LIST_COPY: Record<ListKey, { label: string; placeholder: string }> = {
  specialties: { label: "Specialties", placeholder: "House & Lot" },
  areasServed: { label: "Areas served", placeholder: "Talamban" },
  languages: { label: "Languages", placeholder: "Cebuano" },
};

function ListEditor({ field }: { field: ListKey }) {
  const { form, drafts, setDraft, addListItem, removeListItem } = useAgentStore();
  return (
    <Field label={LIST_COPY[field].label} htmlFor={field}>
      <div className="flex gap-2">
        <TextInput
          id={field}
          value={drafts[field]}
          onChange={(e) => setDraft(field, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addListItem(field);
            }
          }}
          placeholder={LIST_COPY[field].placeholder}
          maxLength={60}
        />
        <Btn type="button" variant="outline" onClick={() => addListItem(field)} disabled={!drafts[field].trim()}>
          Add
        </Btn>
      </div>
      {form[field].length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {form[field].map((value, index) => (
            <li key={value} className="flex items-center gap-1 rounded-full border border-border py-1 pl-3 pr-1.5 text-[12.5px]">
              {value}
              <button type="button" onClick={() => removeListItem(field, index)} aria-label={`Remove ${value}`} className="focusable rounded-full p-0.5 text-muted hover:text-foreground">
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Field>
  );
}

export default function AgentProfilePage() {
  const user = useSessionStore((s) => s.user);
  const reload = useSessionStore((s) => s.reload);
  const { profile, profileLoaded, form, formErrors, saving, saveError, savedAt, loadProfile, setFormField, saveProfile, requestVerification } = useAgentStore();

  useEffect(() => {
    void loadProfile(user?.displayName ?? "");
  }, [loadProfile, user?.displayName]);

  if (!profileLoaded) {
    return (
      <Page>
        <Skeleton className="mb-6 h-9 w-72" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </Page>
    );
  }

  const state = profile?.verificationState ?? "UNVERIFIED";

  return (
    <Page>
      <TopBar title="Agent profile" caption="Buyers see this on listings you represent and on your agent page in the app.">
        <Badge tone={state === "VERIFIED" ? "ok" : state === "SUSPENDED" || state === "REJECTED" ? "bad" : "pending"}>
          {state === "VERIFIED" ? <BadgeCheck className="size-3" aria-hidden /> : null}
          {VERIFICATION_LABEL[state]}
        </Badge>
      </TopBar>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <form
            noValidate
            className="flex flex-col gap-5"
            onSubmit={async (event) => {
              event.preventDefault();
              const saved = await saveProfile();
              if (saved) await reload();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name" htmlFor="displayName" error={formErrors.displayName}>
                <TextInput id="displayName" value={form.displayName} error={formErrors.displayName} onChange={(e) => setFormField("displayName", e.target.value)} maxLength={80} />
              </Field>
              <Field label="Headline" htmlFor="headline" error={formErrors.headline}>
                <TextInput id="headline" value={form.headline} error={formErrors.headline} onChange={(e) => setFormField("headline", e.target.value)} maxLength={80} />
              </Field>
            </div>
            <Field label="About you" htmlFor="bio" error={formErrors.bio} hint={`${form.bio.length} / 2000`}>
              <TextArea id="bio" value={form.bio} error={formErrors.bio} onChange={(e) => setFormField("bio", e.target.value)} maxLength={2000} placeholder="Years of experience, the kinds of properties you handle, how you work with buyers." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="License number" htmlFor="licenseNumber" error={formErrors.licenseNumber} hint="Needed for verification">
                <TextInput id="licenseNumber" value={form.licenseNumber} error={formErrors.licenseNumber} onChange={(e) => setFormField("licenseNumber", e.target.value)} maxLength={40} />
              </Field>
              <Field label="Issued by" htmlFor="licenseAuthority">
                <TextInput id="licenseAuthority" value={form.licenseAuthority} onChange={(e) => setFormField("licenseAuthority", e.target.value)} maxLength={60} />
              </Field>
            </div>
            <ListEditor field="specialties" />
            <ListEditor field="areasServed" />
            <ListEditor field="languages" />
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-[12.5px] font-semibold">Visibility</legend>
              <label className="flex items-center gap-2 text-[13px]">
                <input type="radio" name="publicState" className="accent-foreground" checked={form.publicState === "PUBLIC"} onChange={() => setFormField("publicState", "PUBLIC")} />
                Public — buyers can open your agent page
              </label>
              <label className="flex items-center gap-2 text-[13px]">
                <input type="radio" name="publicState" className="accent-foreground" checked={form.publicState === "HIDDEN"} onChange={() => setFormField("publicState", "HIDDEN")} />
                Hidden — owners can still find and invite you
              </label>
            </fieldset>
            <InlineError message={saveError} />
            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              {savedAt && !saving && !saveError ? (
                <span className="flex items-center gap-1.5 text-[12.5px] text-success">
                  <CheckCircle2 className="size-4" aria-hidden /> Saved
                </span>
              ) : null}
              <Btn type="submit" busy={saving}>
                {profile ? "Save profile" : "Create profile"}
              </Btn>
            </div>
          </form>
        </Card>
        <section>
          <SectionHeading title="Verification" />
          <Card className="p-5">
            {state === "VERIFIED" ? (
              <p className="text-[13px] text-muted">The platform team verified your license. Buyers see a verified badge next to your name.</p>
            ) : state === "PENDING" ? (
              <p className="text-[13px] text-muted">Your license is being reviewed by the platform team. You can keep working while you wait.</p>
            ) : state === "SUSPENDED" ? (
              <p className="flex items-start gap-2 text-[13px] text-danger">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Your agent profile is suspended. Contact support.
              </p>
            ) : (
              <>
                <p className="text-[13px] text-muted">
                  {state === "REJECTED" ? "The platform team could not verify your last request. Check your license details and try again." : "Add your license number and save, then ask the platform team to verify you. Only the platform can mark an agent as verified."}
                </p>
                <Btn className="mt-4" variant="outline" busy={saving} disabled={!profile || !canRequestVerification(profile)} onClick={() => void requestVerification()}>
                  Request verification
                </Btn>
              </>
            )}
          </Card>
        </section>
      </div>
    </Page>
  );
}
