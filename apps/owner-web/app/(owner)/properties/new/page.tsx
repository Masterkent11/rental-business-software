"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { Page, TopBar } from "@/components/owner/shell";
import { Btn, Card, InlineError, LinkBtn } from "@/components/owner/ui";
import { DetailsSection, LocationSection, PricingSection, TypeSection } from "@/components/owner/listing-form";
import { useListingEditorStore } from "@/stores/use-listing-editor-store";
import { WIZARD_STEPS } from "@/domain/listings/listing-form";
import { useSessionStore } from "@/stores/use-session-store";
import { cn } from "@/lib/utils";

const STEP_COPY = [
  { title: "What are you listing?", caption: "Pick the type of place and how you rent it out." },
  { title: "Where is it?", caption: "Customers search by barangay and city." },
  { title: "Describe the place", caption: "A clear title, honest description, and what's included." },
  { title: "Set the price", caption: "Totals are always calculated on the server from these numbers." },
];

export default function NewPropertyPage() {
  const router = useRouter();
  const organizationId = useSessionStore((s) => s.activeOrganizationId);
  const { step, saving, saveError, resetForCreate, nextStep, previousStep, goToStep, createDraft } = useListingEditorStore();

  useEffect(() => {
    resetForCreate();
  }, [resetForCreate]);

  const last = step === WIZARD_STEPS.length - 1;

  return (
    <Page>
      <TopBar title="New property" caption="Saved as a draft. Add photos and availability next, then publish when it's ready.">
        <LinkBtn href="/properties" variant="ghost">
          Cancel
        </LinkBtn>
      </TopBar>

      <ol className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-6" aria-label="Steps">
        {[...WIZARD_STEPS, "Photos", "Publish"].map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label}>
              <button
                type="button"
                disabled={index >= WIZARD_STEPS.length || index > step}
                onClick={() => goToStep(index)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "focusable flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[12.5px] font-medium transition-colors disabled:cursor-default",
                  current ? "border-foreground bg-surface" : done ? "border-border bg-surface text-foreground" : "border-transparent bg-surface-secondary text-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px]",
                    done ? "bg-foreground text-white" : current ? "bg-foreground text-white" : "bg-surface-tertiary",
                  )}
                >
                  {done ? <Check className="size-3" aria-hidden /> : index + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      <Card className="p-6 sm:p-8">
        <h2 className="text-[18px] font-semibold tracking-tight">{STEP_COPY[step]!.title}</h2>
        <p className="mb-6 mt-1 text-[13px] text-muted">{STEP_COPY[step]!.caption}</p>
        <form
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            if (!last) {
              nextStep();
              return;
            }
            if (!organizationId) return;
            const created = await createDraft(organizationId);
            if (created) router.push(`/properties/${created.id}?tab=photos`);
          }}
        >
          {step === 0 ? <TypeSection /> : null}
          {step === 1 ? <LocationSection /> : null}
          {step === 2 ? <DetailsSection /> : null}
          {step === 3 ? <PricingSection /> : null}
          {saveError ? <div className="mt-6"><InlineError message={saveError} /></div> : null}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <Btn type="button" variant="ghost" onClick={previousStep} disabled={step === 0}>
              <ArrowLeft className="size-4" aria-hidden /> Back
            </Btn>
            <Btn type="submit" busy={saving}>
              {last ? "Save draft & add photos" : "Continue"} {last ? null : <ArrowRight className="size-4" aria-hidden />}
            </Btn>
          </div>
        </form>
      </Card>
    </Page>
  );
}
