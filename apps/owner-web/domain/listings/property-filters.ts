import {
  propertyTypeLabel,
  type ListingState,
  type OwnerListing,
  type PropertyType,
} from "./listing";

export type PropertySort =
  | "NEWEST"
  | "OLDEST"
  | "TITLE"
  | "VIEWS"
  | "PRICE_ASC"
  | "PRICE_DESC";
export interface PropertyFilters {
  readonly location: string;
  readonly propertyType: PropertyType | "ALL";
  readonly sort: PropertySort;
}
export const DEFAULT_PROPERTY_FILTERS: PropertyFilters = {
  location: "ALL",
  propertyType: "ALL",
  sort: "NEWEST",
};

export function selectProperties(
  listings: readonly OwnerListing[],
  status: ListingState | "ALL",
  query: string,
  filters: PropertyFilters,
): OwnerListing[] {
  const text = query.trim().toLocaleLowerCase();
  const selected = listings.filter(
    (listing) =>
      (status === "ALL" || listing.state === status) &&
      (filters.location === "ALL" || listing.cityLabel === filters.location) &&
      (filters.propertyType === "ALL" ||
        listing.propertyType === filters.propertyType) &&
      (!text ||
        `${listing.title} ${listing.propertyName} ${listing.areaLabel} ${listing.cityLabel} ${propertyTypeLabel(listing.propertyType, listing.intent)}`
          .toLocaleLowerCase()
          .includes(text)),
  );
  const updated = (listing: OwnerListing) => {
    const time = Date.parse(listing.updatedAt ?? listing.publishedAt ?? "");
    return Number.isFinite(time) ? time : 0;
  };
  return selected.sort((a, b) => {
    switch (filters.sort) {
      case "TITLE":
        return a.title.localeCompare(b.title);
      case "VIEWS":
        return (b.activity?.views ?? -1) - (a.activity?.views ?? -1);
      case "OLDEST":
        return updated(a) - updated(b);
      case "PRICE_ASC":
      case "PRICE_DESC": {
        const left = a.intent === "SALE" ? null : a.priceCentavos;
        const right = b.intent === "SALE" ? null : b.priceCentavos;
        if (left === null) return right === null ? 0 : 1;
        if (right === null) return -1;
        return filters.sort === "PRICE_ASC" ? left - right : right - left;
      }
      default:
        return updated(b) - updated(a);
    }
  });
}
