"use client";

import { Crosshair, Lock, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES, RENTAL_MODES, SALE_PROPERTY_TYPES, SALE_STATUSES, mapEmbedUrl } from "@/domain/listings/listing";
import { locationFrom } from "@/domain/listings/listing-form";
import { useListingEditorStore } from "@/stores/use-listing-editor-store";
import { Btn, Field, InlineError, TextArea, TextInput } from "./ui";

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

const choiceClass = (selected: boolean) =>
  cn(
    "focusable rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    selected ? "border-foreground bg-surface ring-1 ring-foreground" : "border-border bg-surface hover:border-foreground/30",
  );

function SaleTypeSection({ lockType }: { lockType: boolean }) {
  const { form, errors, setField } = useListingEditorStore();
  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold">Property type</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SALE_PROPERTY_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              disabled={lockType}
              aria-pressed={form.propertyType === type.value}
              onClick={() => setField("propertyType", type.value)}
              className={choiceClass(form.propertyType === type.value)}
            >
              <span className="block text-[14px] font-semibold">{type.label}</span>
              <span className="mt-0.5 block text-[12px] text-muted">{type.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold">Sale status</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {SALE_STATUSES.map((status) => (
            <button
              key={status.value}
              type="button"
              aria-pressed={form.saleStatus === status.value}
              onClick={() => setField("saleStatus", status.value)}
              className={choiceClass(form.saleStatus === status.value)}
            >
              <span className="block text-[14px] font-semibold">{status.label}</span>
              <span className="mt-0.5 block text-[12px] text-muted">{status.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Property name" htmlFor="name" error={errors.name} hint="The development, building or home name">
        <TextInput id="name" value={form.name} error={errors.name} onChange={(e) => setField("name", e.target.value)} placeholder="Talamban Modern Residence" maxLength={120} />
      </Field>
    </div>
  );
}

export function TypeSection({ lockMode = false }: { lockMode?: boolean }) {
  const { form, errors, setField } = useListingEditorStore();
  if (form.intent === "SALE") return <SaleTypeSection lockType={false} />;
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

function CoordinatesSection() {
  const { form, errors, setField, setCoordinates, locating, setLocating } = useListingEditorStore();
  const location = locationFrom(form);
  const sale = form.intent === "SALE";
  return (
    <div className="flex flex-col gap-4 sm:col-span-2">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Latitude" htmlFor="latitude" className="w-40">
          <TextInput id="latitude" inputMode="decimal" value={form.latitude} error={errors.latitude} onChange={(e) => setField("latitude", e.target.value)} placeholder="10.3297" />
        </Field>
        <Field label="Longitude" htmlFor="longitude" className="w-40">
          <TextInput id="longitude" inputMode="decimal" value={form.longitude} error={errors.latitude} onChange={(e) => setField("longitude", e.target.value)} placeholder="123.9052" />
        </Field>
        <Btn
          type="button"
          variant="outline"
          busy={locating}
          onClick={() => {
            if (!("geolocation" in navigator)) return;
            setLocating(true);
            navigator.geolocation.getCurrentPosition(
              (position) => setCoordinates(position.coords.latitude, position.coords.longitude),
              () => setLocating(false),
              { enableHighAccuracy: true, timeout: 10_000 },
            );
          }}
        >
          <Crosshair className="size-4" aria-hidden /> Use my current location
        </Btn>
      </div>
      <InlineError message={errors.latitude ?? null} />
      <p className="text-[12px] text-muted">
        {sale ? "Required for properties for sale." : "Optional, but listings with a location appear in “Near you”."} Stand at the property and use your location, or copy the coordinates from a map.
      </p>
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold">What customers see on the map</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" aria-pressed={form.locationPrivacy === "APPROXIMATE"} onClick={() => setField("locationPrivacy", "APPROXIMATE")} className={choiceClass(form.locationPrivacy === "APPROXIMATE")}>
            <span className="block text-[14px] font-semibold">Approximate area</span>
            <span className="mt-0.5 block text-[12px] text-muted">Rounded to about a kilometre. Best for homes.</span>
          </button>
          <button type="button" aria-pressed={form.locationPrivacy === "EXACT"} onClick={() => setField("locationPrivacy", "EXACT")} className={choiceClass(form.locationPrivacy === "EXACT")}>
            <span className="block text-[14px] font-semibold">Exact pin</span>
            <span className="mt-0.5 block text-[12px] text-muted">For public buildings and condominium towers.</span>
          </button>
        </div>
      </fieldset>
      {location ? (
        <iframe
          title="Property location"
          src={mapEmbedUrl(location)}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-64 w-full rounded-2xl border border-border"
        />
      ) : null}
    </div>
  );
}

export function LocationSection() {
  const { form, errors, setField } = useListingEditorStore();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Street address" htmlFor="addressLine" hint={form.intent === "SALE" ? "Shared with buyers by the agent or owner" : "Shown to guests after they book"} className="sm:col-span-2">
        <TextInput id="addressLine" value={form.addressLine} onChange={(e) => setField("addressLine", e.target.value)} placeholder="24 Gorordo Avenue" autoComplete="street-address" maxLength={200} />
      </Field>
      <Field label="Barangay / area" htmlFor="areaLabel" error={errors.areaLabel}>
        <TextInput id="areaLabel" value={form.areaLabel} error={errors.areaLabel} onChange={(e) => setField("areaLabel", e.target.value)} placeholder="Brgy. Lahug" maxLength={120} />
      </Field>
      <Field label="City" htmlFor="cityLabel" error={errors.cityLabel}>
        <TextInput id="cityLabel" value={form.cityLabel} error={errors.cityLabel} onChange={(e) => setField("cityLabel", e.target.value)} placeholder="Cebu City" autoComplete="address-level2" maxLength={120} />
      </Field>
      <CoordinatesSection />
    </div>
  );
}

export function SaleDetailsSection() {
  const { form, errors, setField } = useListingEditorStore();
  return (
    <div className="flex flex-col gap-5">
      <Field label="Listing title" htmlFor="title" error={errors.title} hint="What buyers see first">
        <TextInput id="title" value={form.title} error={errors.title} onChange={(e) => setField("title", e.target.value)} placeholder="Modern house and lot in Talamban" maxLength={120} />
      </Field>
      <Field label="Description" htmlFor="description" error={errors.description} hint={`${form.description.trim().length} / 4000 characters`}>
        <TextArea id="description" value={form.description} error={errors.description} onChange={(e) => setField("description", e.target.value)} placeholder="Layout, finishes, title status, what's nearby." maxLength={4000} />
      </Field>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Field label="Bedrooms" htmlFor="bedrooms" error={errors.bedrooms}>
          <TextInput id="bedrooms" inputMode="numeric" value={form.bedrooms} error={errors.bedrooms} onChange={(e) => setField("bedrooms", e.target.value)} />
        </Field>
        <Field label="Bathrooms" htmlFor="bathrooms" error={errors.bathrooms}>
          <TextInput id="bathrooms" inputMode="numeric" value={form.bathrooms} error={errors.bathrooms} onChange={(e) => setField("bathrooms", e.target.value)} />
        </Field>
        <Field label="Floor area (m²)" htmlFor="floorArea" error={errors.floorArea}>
          <TextInput id="floorArea" inputMode="numeric" value={form.floorArea} error={errors.floorArea} onChange={(e) => setField("floorArea", e.target.value)} placeholder="220" />
        </Field>
        <Field label="Lot area (m²)" htmlFor="lotArea" error={errors.lotArea}>
          <TextInput id="lotArea" inputMode="numeric" value={form.lotArea} error={errors.lotArea} onChange={(e) => setField("lotArea", e.target.value)} placeholder="300" />
        </Field>
        <Field label="Parking" htmlFor="parkingSlots" error={errors.parkingSlots}>
          <TextInput id="parkingSlots" inputMode="numeric" value={form.parkingSlots} error={errors.parkingSlots} onChange={(e) => setField("parkingSlots", e.target.value)} />
        </Field>
      </div>
      {form.saleStatus !== "READY_FOR_OCCUPANCY" ? (
        <Field label="Expected turnover" htmlFor="availableFrom" hint="When buyers can move in">
          <TextInput id="availableFrom" type="date" value={form.availableFrom} onChange={(e) => setField("availableFrom", e.target.value)} className="sm:w-60" />
        </Field>
      ) : null}
      <ChipList id="amenities" label="Features" hint="What's included" field="amenities" suggestions={["Garage", "Garden", "En-suite master", "Maid's room", "Balcony", "Pool", "Gym", "24/7 security", "Corner lot", "Clean title"]} />
    </div>
  );
}

export function PrivateTermsSection({ readOnly = false }: { readOnly?: boolean }) {
  const { form, errors, setField } = useListingEditorStore();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-secondary/60 px-4 py-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
        <p className="text-[13px] text-muted">
          These terms are confidential. They are never shown in the customer app, in search, or on the listing. Buyers see “Price available on inquiry”, and you share the price privately in the conversation.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Internal asking price (₱)" htmlFor="askingPrice" error={errors.askingPrice} hint="Optional. Visible only to you and permitted agents.">
          <TextInput id="askingPrice" inputMode="decimal" disabled={readOnly} value={form.askingPrice} error={errors.askingPrice} onChange={(e) => setField("askingPrice", e.target.value)} placeholder="18500000" />
        </Field>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-[12.5px] font-semibold">Negotiable</legend>
          <div className="flex gap-2">
            <button type="button" disabled={readOnly} aria-pressed={form.priceNegotiable} onClick={() => setField("priceNegotiable", true)} className={cn(choiceClass(form.priceNegotiable), "py-2")}>Open to offers</button>
            <button type="button" disabled={readOnly} aria-pressed={!form.priceNegotiable} onClick={() => setField("priceNegotiable", false)} className={cn(choiceClass(!form.priceNegotiable), "py-2")}>Fixed price</button>
          </div>
        </fieldset>
      </div>
      <Field label="Commercial notes" htmlFor="commercialNotes" error={errors.commercialNotes} hint="Payment terms, discounts, dues. Private.">
        <TextArea id="commercialNotes" disabled={readOnly} value={form.commercialNotes} error={errors.commercialNotes} onChange={(e) => setField("commercialNotes", e.target.value)} maxLength={4000} />
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
