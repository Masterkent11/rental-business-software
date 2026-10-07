import type { ListingDetailsInput, OwnerListing, PropertyType, RentalMode } from "./listing";

export interface ListingForm {
  name: string;
  propertyType: PropertyType;
  rentalMode: Exclude<RentalMode, "HYBRID">;
  unitLabel: string;
  addressLine: string;
  areaLabel: string;
  cityLabel: string;
  title: string;
  description: string;
  price: string;
  cleaningFee: string;
  minStayNights: string;
  advanceMonths: string;
  depositMonths: string;
  maxOccupants: string;
  bedrooms: string;
  bathrooms: string;
  floorArea: string;
  availableFrom: string;
  amenities: string[];
  houseRules: string[];
  terms: string[];
}

export type FormErrors = Partial<Record<keyof ListingForm, string>>;

export const WIZARD_STEPS = ["Type", "Location", "Details", "Pricing"] as const;

export const emptyForm = (): ListingForm => ({
  name: "",
  propertyType: "CONDO",
  rentalMode: "SHORT_TERM",
  unitLabel: "",
  addressLine: "",
  areaLabel: "",
  cityLabel: "Cebu City",
  title: "",
  description: "",
  price: "",
  cleaningFee: "0",
  minStayNights: "1",
  advanceMonths: "1",
  depositMonths: "2",
  maxOccupants: "2",
  bedrooms: "1",
  bathrooms: "1",
  floorArea: "",
  availableFrom: "",
  amenities: [],
  houseRules: [],
  terms: [],
});

const pesosToCentavos = (value: string) => Math.round(Number(value.replace(/,/g, "")) * 100);
const intOr = (value: string, fallback: number) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function formFromListing(listing: OwnerListing): ListingForm {
  return {
    name: listing.propertyName,
    propertyType: listing.propertyType ?? "APARTMENT",
    rentalMode: listing.kind,
    unitLabel: "",
    addressLine: listing.addressLine,
    areaLabel: listing.areaLabel,
    cityLabel: listing.cityLabel,
    title: listing.title,
    description: listing.description,
    price: String(listing.priceCentavos / 100),
    cleaningFee: String(listing.cleaningFeeCentavos / 100),
    minStayNights: String(listing.minStayNights ?? 1),
    advanceMonths: String(listing.advanceMonths),
    depositMonths: String(listing.depositMonths),
    maxOccupants: String(listing.maxOccupants),
    bedrooms: String(listing.bedrooms),
    bathrooms: String(listing.bathrooms),
    floorArea: listing.floorAreaSqm ? String(listing.floorAreaSqm) : "",
    availableFrom: listing.availableFrom ?? "",
    amenities: [...listing.amenities],
    houseRules: [...listing.houseRules],
    terms: [...listing.terms],
  };
}

export function listingDetailsFrom(form: ListingForm): ListingDetailsInput {
  const shortStay = form.rentalMode === "SHORT_TERM";
  return {
    kind: form.rentalMode,
    title: form.title.trim(),
    description: form.description.trim(),
    priceCentavos: pesosToCentavos(form.price),
    amenities: form.amenities,
    houseRules: form.houseRules,
    terms: form.terms,
    minStayNights: shortStay ? intOr(form.minStayNights, 1) : null,
    advanceMonths: shortStay ? 0 : intOr(form.advanceMonths, 0),
    depositMonths: shortStay ? 0 : intOr(form.depositMonths, 0),
    maxOccupants: intOr(form.maxOccupants, 1),
    bedrooms: intOr(form.bedrooms, 0),
    bathrooms: intOr(form.bathrooms, 0),
    floorAreaSqm: form.floorArea ? intOr(form.floorArea, 0) || null : null,
    cleaningFeeCentavos: shortStay ? pesosToCentavos(form.cleaningFee || "0") : 0,
    availableFrom: shortStay ? null : form.availableFrom || null,
  };
}

export function validateStep(form: ListingForm, step: number): FormErrors {
  const errors: FormErrors = {};
  if (step === 0) {
    if (form.name.trim().length < 2) errors.name = "Give the property a name";
  }
  if (step === 1) {
    if (form.areaLabel.trim().length < 2) errors.areaLabel = "Add the barangay or neighbourhood";
    if (form.cityLabel.trim().length < 2) errors.cityLabel = "Add the city";
  }
  if (step === 2) {
    if (form.title.trim().length < 3) errors.title = "Use at least 3 characters";
    if (form.description.trim().length < 20) errors.description = "Describe the place in at least 20 characters";
    const occupants = Number(form.maxOccupants);
    if (!Number.isInteger(occupants) || occupants < 1 || occupants > 50) errors.maxOccupants = "Between 1 and 50";
    if (!/^\d+$/.test(form.bedrooms)) errors.bedrooms = "Whole number";
    if (!/^\d+$/.test(form.bathrooms)) errors.bathrooms = "Whole number";
    if (form.floorArea && !/^\d+$/.test(form.floorArea)) errors.floorArea = "Whole number of square metres";
  }
  if (step === 3) {
    const price = Number(form.price.replace(/,/g, ""));
    if (!Number.isFinite(price) || price <= 0) errors.price = "Set a price greater than zero";
    if (form.rentalMode === "SHORT_TERM") {
      const nights = Number(form.minStayNights);
      if (!Number.isInteger(nights) || nights < 1 || nights > 90) errors.minStayNights = "Between 1 and 90 nights";
      const fee = Number(form.cleaningFee || "0");
      if (!Number.isFinite(fee) || fee < 0) errors.cleaningFee = "Zero or more";
    } else {
      const advance = Number(form.advanceMonths);
      const deposit = Number(form.depositMonths);
      if (!Number.isInteger(advance) || advance < 0 || advance > 6) errors.advanceMonths = "0 to 6 months";
      if (!Number.isInteger(deposit) || deposit < 0 || deposit > 6) errors.depositMonths = "0 to 6 months";
    }
  }
  return errors;
}

