import type {
  ListingDetailsInput,
  ListingIntent,
  ListingLocation,
  LocationPrivacy,
  OwnerListing,
  PropertyType,
  RentalMode,
  SaleListingDetailsInput,
  SaleStatus,
  SaleTerms,
} from "./listing";

export function locationProblem(location: { latitude: number | null; longitude: number | null }): string | null {
  const { latitude, longitude } = location;
  if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "Set the location: use your current position or enter the coordinates.";
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return "Those coordinates are not on the map.";
  if (latitude === 0 && longitude === 0) return "Set the property location on the map.";
  return null;
}

export interface ListingForm {
  intent: ListingIntent;
  latitude: string;
  longitude: string;
  locationPrivacy: LocationPrivacy;
  saleStatus: SaleStatus;
  lotArea: string;
  parkingSlots: string;
  askingPrice: string;
  priceNegotiable: boolean;
  commercialNotes: string;
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

export const SALE_WIZARD_STEPS = ["Type", "Location", "Details", "Private terms"] as const;

export const stepsFor = (intent: ListingIntent): readonly string[] => (intent === "SALE" ? SALE_WIZARD_STEPS : WIZARD_STEPS);

export const emptyForm = (intent: ListingIntent = "RENT"): ListingForm => ({
  intent,
  latitude: "",
  longitude: "",
  locationPrivacy: "APPROXIMATE",
  saleStatus: "READY_FOR_OCCUPANCY",
  lotArea: "",
  parkingSlots: "0",
  askingPrice: "",
  priceNegotiable: true,
  commercialNotes: "",
  name: "",
  propertyType: intent === "SALE" ? "HOUSE" : "CONDO",
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

const coordinate = (value: number | undefined | null) => (value === undefined || value === null ? "" : String(value));

export function formFromListing(listing: OwnerListing, terms: SaleTerms | null = null): ListingForm {
  return {
    intent: listing.intent,
    latitude: coordinate(listing.location?.latitude),
    longitude: coordinate(listing.location?.longitude),
    locationPrivacy: listing.location?.privacy ?? "APPROXIMATE",
    saleStatus: listing.saleStatus ?? "READY_FOR_OCCUPANCY",
    lotArea: listing.lotAreaSqm ? String(listing.lotAreaSqm) : "",
    parkingSlots: String(listing.parkingSlots),
    askingPrice: terms?.askingPriceInternalCentavos ? String(terms.askingPriceInternalCentavos / 100) : "",
    priceNegotiable: terms?.priceNegotiable ?? true,
    commercialNotes: terms?.commercialNotes ?? "",
    name: listing.propertyName,
    propertyType: listing.propertyType ?? "APARTMENT",
    rentalMode: listing.kind ?? "SHORT_TERM",
    unitLabel: "",
    addressLine: listing.addressLine,
    areaLabel: listing.areaLabel,
    cityLabel: listing.cityLabel,
    title: listing.title,
    description: listing.description,
    price: listing.priceCentavos === null ? "" : String(listing.priceCentavos / 100),
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

const parseCoordinate = (value: string): number | null => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export function locationFrom(form: ListingForm): ListingLocation | null {
  const latitude = parseCoordinate(form.latitude);
  const longitude = parseCoordinate(form.longitude);
  if (latitude === null || longitude === null || locationProblem({ latitude, longitude })) return null;
  return { latitude, longitude, privacy: form.locationPrivacy };
}

export function saleDetailsFrom(form: ListingForm): SaleListingDetailsInput {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    amenities: form.amenities,
    saleStatus: form.saleStatus,
    bedrooms: intOr(form.bedrooms, 0),
    bathrooms: intOr(form.bathrooms, 0),
    floorAreaSqm: form.floorArea ? intOr(form.floorArea, 0) || null : null,
    lotAreaSqm: form.lotArea ? intOr(form.lotArea, 0) || null : null,
    parkingSlots: intOr(form.parkingSlots, 0),
    availableFrom: form.availableFrom || null,
  };
}

export function saleTermsFrom(form: ListingForm): Omit<SaleTerms, "updatedAt"> {
  const price = form.askingPrice.trim() ? pesosToCentavos(form.askingPrice) : null;
  return {
    askingPriceInternalCentavos: price && price > 0 ? price : null,
    priceNegotiable: form.priceNegotiable,
    commercialNotes: form.commercialNotes.trim(),
  };
}

export function validateStep(form: ListingForm, step: number): FormErrors {
  const errors: FormErrors = {};
  const sale = form.intent === "SALE";
  if (step === 0) {
    if (form.name.trim().length < 2) errors.name = "Give the property a name";
  }
  if (step === 1) {
    if (form.areaLabel.trim().length < 2) errors.areaLabel = "Add the barangay or neighbourhood";
    if (form.cityLabel.trim().length < 2) errors.cityLabel = "Add the city";
    const latitude = parseCoordinate(form.latitude);
    const longitude = parseCoordinate(form.longitude);
    const anyCoordinate = latitude !== null || longitude !== null;
    if (sale || anyCoordinate) {
      const problem = locationProblem({ latitude, longitude });
      if (problem) errors.latitude = problem;
    }
  }
  if (step === 2 && sale) {
    if (form.title.trim().length < 3) errors.title = "Use at least 3 characters";
    if (form.description.trim().length < 20) errors.description = "Describe the property in at least 20 characters";
    if (!/^\d+$/.test(form.bedrooms)) errors.bedrooms = "Whole number";
    if (!/^\d+$/.test(form.bathrooms)) errors.bathrooms = "Whole number";
    if (!/^\d+$/.test(form.parkingSlots)) errors.parkingSlots = "Whole number";
    if (form.propertyType === "LOT") {
      if (!/^[1-9]\d*$/.test(form.lotArea)) errors.lotArea = "Add the lot area in square metres";
    } else if (!/^[1-9]\d*$/.test(form.floorArea)) {
      errors.floorArea = "Add the floor area in square metres";
    }
    if (form.lotArea && !/^[1-9]\d*$/.test(form.lotArea)) errors.lotArea = "Whole number of square metres";
    return errors;
  }
  if (step === 3 && sale) {
    if (form.askingPrice.trim()) {
      const price = Number(form.askingPrice.replace(/,/g, ""));
      if (!Number.isFinite(price) || price <= 0) errors.askingPrice = "Enter a positive amount or leave it empty";
    }
    if (form.commercialNotes.length > 4000) errors.commercialNotes = "Keep notes under 4,000 characters";
    return errors;
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

