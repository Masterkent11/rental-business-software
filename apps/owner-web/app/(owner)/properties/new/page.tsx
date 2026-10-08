"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { Page, TopBar } from "@/components/owner/shell";
import { Btn, Card, InlineError, LinkBtn } from "@/components/owner/ui";
import {
  DetailsSection,
  LocationSection,
  PricingSection,
  PrivateTermsSection,
  SaleDetailsSection,
  TypeSection,
} from "@/components/owner/listing-form";
import { useListingEditorStore } from "@/stores/use-listing-editor-store";
import { stepsFor } from "@/domain/listings/listing-form";
import { useSessionStore } from "@/stores/use-session-store";
import { cn } from "@/lib/utils";

const STEP_COPY = [
  { title: "What are you listing?", caption: "Pick the type of place and how you rent it out." },
  { title: "Where is it?", caption: "Customers search by barangay and city." },
  { title: "Describe the place", caption: "A clear title, honest description, and what's included." },
  { title: "Set the price", caption: "Totals are always calculated on the server from these numbers." },
];

const SALE_STEP_COPY = [
  { title: "What are you selling?", caption: "Pick the property type and where it is in its build." },
  { title: "Where is it?", caption: "Buyers search near them. Choose whether to show the exact pin or an approximate area." },
  { title: "Describe the property", caption: "Sizes, rooms and features help buyers decide to inquire." },
  { title: "Private terms", caption: "Optional. Never shown to buyers. The listing always says “Price available on inquiry”." },
];

function NewProperty() {
  const router = useRouter();
  const search = useSearchParams();
  const intent = search.get("intent") === "sale" ? "SALE" : "RENT";
  const organizationId = useSessionStore((s) => s.activeOrganizationId);
  const { form, step, saving, saveError, resetForCreate, nextStep, previousStep, goToStep, createDraft } = useListingEditorStore();

  useEffect(() => {
    resetForCreate(intent);
  }, [resetForCreate, intent]);

  const sale = form.intent === "SALE";
  const steps = stepsFor(form.intent);
  const copy = sale ? SALE_STEP_COPY : STEP_COPY;
  const last = step === steps.length - 1;

  return (
    <Page>
      <TopBar
        title={sale ? "New property for sale" : "New rental"}
        caption={sale ? "Saved as a draft. Add photos, floor plans and a tour next, then publish." : "Saved as a draft. Add photos and availability next, then publish when it's ready."}
      >
        <LinkBtn href="/properties" variant="ghost">
          Cancel
        </LinkBtn>
      </TopBar>

      <ol className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-6" aria-label="Steps">
        {[...steps, "Photos", "Publish"].map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label}>
              <button
                type="button"
                disabled={index >= steps.length || index > step}
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
        <h2 className="text-[18px] font-semibold tracking-tight">{copy[step]!.title}</h2>
        <p className="mb-6 mt-1 text-[13px] text-muted">{copy[step]!.caption}</p>
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
          {step === 2 ? sale ? <SaleDetailsSection /> : <DetailsSection /> : null}
          {step === 3 ? sale ? <PrivateTermsSection /> : <PricingSection /> : null}
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

export default function NewPropertyPage() {
  return (
    <Suspense fallback={null}>
      <NewProperty />
    </Suspense>
  );
}
