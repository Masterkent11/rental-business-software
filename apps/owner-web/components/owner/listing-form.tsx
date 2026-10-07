"use client";

import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES, RENTAL_MODES } from "@/domain/listings/listing";
import { useListingEditorStore } from "@/stores/use-listing-editor-store";
import { Field, TextArea, TextInput } from "./ui";

const SUGGESTED_AMENITIES = ["Wi-Fi", "Aircon", "Kitchen", "Washing machine", "Parking", "Hot shower", "Work desk", "Smart TV", "Pool access", "Gym access", "24/7 security", "Balcony"];
const SUGGESTED_RULES = ["No smoking", "No pets", "No parties", "Quiet hours after 10 PM", "Visitors until 10 PM"];

function ChipList({
  id,
  label,
  hint,
  field,
  suggestions = [],
}: {
  id: string;
  label: string;
  hint: string;
  field: "amenities" | "houseRules" | "terms";
  suggestions?: readonly string[];
}) {
  const { form, drafts, setDraft, addItem, removeItem, setField } = useListingEditorStore();
  const items = form[field];
  const remaining = suggestions.filter((s) => !items.includes(s));
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="flex gap-2">
        <TextInput
          id={id}
          value={drafts[field]}
          onChange={(event) => setDraft(field, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem(field);
            }
          }}
          placeholder="Type and press Enter"
          maxLength={120}
        />
        <button
          type="button"
          onClick={() => addItem(field)}
          className="focusable flex h-11 shrink-0 items-center gap-1 rounded-xl border border-border px-3 text-[13px] font-medium hover:bg-surface-secondary"
        >
          <Plus className="size-4" aria-hidden /> Add
        </button>
      </div>
      {items.length > 0 ? (
        <ul className="mt-1 flex flex-wrap gap-1.5" aria-label={label}>
          {items.map((item, index) => (
            <li key={item} className="flex items-center gap-1 rounded-full bg-surface-secondary py-1 pl-3 pr-1 text-[12.5px]">
              {item}
              <button
                type="button"
                onClick={() => removeItem(field, index)}
                aria-label={`Remove ${item}`}
                className="focusable rounded-full p-1 text-muted hover:bg-surface-tertiary hover:text-foreground"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {remaining.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {remaining.slice(0, 8).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setField(field, [...items, suggestion])}
              className="focusable rounded-full border border-dashed border-border px-2.5 py-1 text-[12px] text-muted hover:border-foreground/30 hover:text-foreground"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </Field>
  );
}

export function TypeSection({ lockMode = false }: { lockMode?: boolean }) {
  const { form, errors, setField } = useListingEditorStore();
  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold">Property type</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PROPERTY_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              aria-pressed={form.propertyType === type.value}
              onClick={() => setField("propertyType", type.value)}
              className={cn(
                "focusable rounded-2xl border px-4 py-3 text-left transition-colors",
                form.propertyType === type.value ? "border-foreground bg-surface ring-1 ring-foreground" : "border-border bg-surface hover:border-foreground/30",
              )}
            >
              <span className="block text-[14px] font-semibold">{type.label}</span>
              <span className="mt-0.5 block text-[12px] text-muted">{type.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold">How do you rent it out?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {RENTAL_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              disabled={lockMode}
              aria-pressed={form.rentalMode === mode.value}
              onClick={() => setField("rentalMode", mode.value as "SHORT_TERM" | "LONG_TERM")}
              className={cn(
                "focusable rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                form.rentalMode === mode.value ? "border-foreground bg-surface ring-1 ring-foreground" : "border-border bg-surface hover:border-foreground/30",
              )}
            >
              <span className="block text-[14px] font-semibold">{mode.label}</span>
              <span className="mt-0.5 block text-[12px] text-muted">{mode.hint}</span>
            </button>
          ))}
        </div>
        {lockMode ? <p className="mt-2 text-[12px] text-muted">The rental mode can only change while the listing is a draft.</p> : null}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Property name" htmlFor="name" error={errors.name} hint="What your building or home is called">
          <TextInput id="name" value={form.name} error={errors.name} onChange={(e) => setField("name", e.target.value)} placeholder="Skyline Tower" maxLength={120} />
        </Field>
        <Field label="Unit (optional)" htmlFor="unitLabel" hint="e.g. Unit 12B, Room 3">
          <TextInput id="unitLabel" value={form.unitLabel} onChange={(e) => setField("unitLabel", e.target.value)} placeholder="Unit 12B" maxLength={80} />
        </Field>
      </div>
    </div>
  );
}

export function LocationSection() {
  const { form, errors, setField } = useListingEditorStore();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Street address" htmlFor="addressLine" hint="Shown to guests after they book" className="sm:col-span-2">
        <TextInput id="addressLine" value={form.addressLine} onChange={(e) => setField("addressLine", e.target.value)} placeholder="24 Gorordo Avenue" autoComplete="street-address" maxLength={200} />
      </Field>
      <Field label="Barangay / area" htmlFor="areaLabel" error={errors.areaLabel}>
        <TextInput id="areaLabel" value={form.areaLabel} error={errors.areaLabel} onChange={(e) => setField("areaLabel", e.target.value)} placeholder="Brgy. Lahug" maxLength={120} />
      </Field>
      <Field label="City" htmlFor="cityLabel" error={errors.cityLabel}>
        <TextInput id="cityLabel" value={form.cityLabel} error={errors.cityLabel} onChange={(e) => setField("cityLabel", e.target.value)} placeholder="Cebu City" autoComplete="address-level2" maxLength={120} />
      </Field>
    </div>
  );
}

export function DetailsSection() {
  const { form, errors, setField } = useListingEditorStore();
  return (
    <div className="flex flex-col gap-5">
      <Field label="Listing title" htmlFor="title" error={errors.title} hint="What customers see first">
        <TextInput id="title" value={form.title} error={errors.title} onChange={(e) => setField("title", e.target.value)} placeholder="Bright studio with a city view" maxLength={120} />
      </Field>
      <Field label="Description" htmlFor="description" error={errors.description} hint={`${form.description.trim().length} / 4000 characters`}>
        <TextArea id="description" value={form.description} error={errors.description} onChange={(e) => setField("description", e.target.value)} placeholder="What makes the place great, what's nearby, who it suits." maxLength={4000} />
      </Field>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Max guests" htmlFor="maxOccupants" error={errors.maxOccupants}>
          <TextInput id="maxOccupants" inputMode="numeric" value={form.maxOccupants} error={errors.maxOccupants} onChange={(e) => setField("maxOccupants", e.target.value)} />
        </Field>
        <Field label="Bedrooms" htmlFor="bedrooms" error={errors.bedrooms}>
          <TextInput id="bedrooms" inputMode="numeric" value={form.bedrooms} error={errors.bedrooms} onChange={(e) => setField("bedrooms", e.target.value)} />
        </Field>
        <Field label="Bathrooms" htmlFor="bathrooms" error={errors.bathrooms}>
          <TextInput id="bathrooms" inputMode="numeric" value={form.bathrooms} error={errors.bathrooms} onChange={(e) => setField("bathrooms", e.target.value)} />
        </Field>
        <Field label="Floor area (m²)" htmlFor="floorArea" error={errors.floorArea}>
          <TextInput id="floorArea" inputMode="numeric" value={form.floorArea} error={errors.floorArea} onChange={(e) => setField("floorArea", e.target.value)} placeholder="32" />
        </Field>
      </div>
      <ChipList id="amenities" label="Amenities" hint="What's included" field="amenities" suggestions={SUGGESTED_AMENITIES} />
      <ChipList id="houseRules" label="House rules" hint="What guests should respect" field="houseRules" suggestions={SUGGESTED_RULES} />
    </div>
  );
}

export function PricingSection() {
  const { form, errors, setField } = useListingEditorStore();
  const nightly = form.rentalMode === "SHORT_TERM";
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={nightly ? "Price per night (₱)" : "Monthly rent (₱)"} htmlFor="price" error={errors.price}>
          <TextInput id="price" inputMode="decimal" value={form.price} error={errors.price} onChange={(e) => setField("price", e.target.value)} placeholder={nightly ? "2800" : "18000"} />
        </Field>
        {nightly ? (
          <Field label="Cleaning fee (₱)" htmlFor="cleaningFee" error={errors.cleaningFee} hint="Charged once per stay">
            <TextInput id="cleaningFee" inputMode="decimal" value={form.cleaningFee} error={errors.cleaningFee} onChange={(e) => setField("cleaningFee", e.target.value)} />
          </Field>
        ) : (
          <Field label="Available from" htmlFor="availableFrom" hint="Leave empty if it's available now">
            <TextInput id="availableFrom" type="date" value={form.availableFrom} onChange={(e) => setField("availableFrom", e.target.value)} />
          </Field>
        )}
        {nightly ? (
          <Field label="Minimum nights" htmlFor="minStayNights" error={errors.minStayNights}>
            <TextInput id="minStayNights" inputMode="numeric" value={form.minStayNights} error={errors.minStayNights} onChange={(e) => setField("minStayNights", e.target.value)} />
          </Field>
        ) : (
          <>
            <Field label="Advance (months)" htmlFor="advanceMonths" error={errors.advanceMonths}>
              <TextInput id="advanceMonths" inputMode="numeric" value={form.advanceMonths} error={errors.advanceMonths} onChange={(e) => setField("advanceMonths", e.target.value)} />
            </Field>
            <Field label="Deposit (months)" htmlFor="depositMonths" error={errors.depositMonths}>
              <TextInput id="depositMonths" inputMode="numeric" value={form.depositMonths} error={errors.depositMonths} onChange={(e) => setField("depositMonths", e.target.value)} />
            </Field>
          </>
        )}
      </div>
      <ChipList
        id="terms"
        label="Terms"
        hint={nightly ? "Check-in times, cancellation policy" : "Minimum term, what's billed separately"}
        field="terms"
        suggestions={nightly ? ["Check-in 2:00 PM · check-out 12:00 NN", "Free cancellation up to 7 days before check-in"] : ["12-month minimum term", "Water and electricity billed separately"]}
      />
    </div>
  );
}
