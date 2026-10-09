import type { PropertyType } from '@/domain/listings/listing-state.ts';

export interface CategoryMatch {
  readonly propertyType: PropertyType;
  readonly label: string;
}

export const CATEGORY_LABELS: Readonly<Record<PropertyType, readonly string[]>> = {
  APARTMENT: ['Apartment', 'Apartments'],
  CONDO: ['Condo', 'Condos', 'Condominium'],
  HOUSE: ['House', 'Houses', 'House and lot', 'House & Lot'],
  ROOM: ['Room', 'Rooms', 'Private room'],
  BOARDING_HOUSE: ['Boarding house', 'Bed space', 'Dormitory'],
  TOWNHOUSE: ['Townhouse', 'Townhouses'],
  LOT: ['Lot', 'Lots', 'Land'],
  COMMERCIAL: ['Commercial', 'Office', 'Shop'],
};

export function matchCategories(text: string, limit = 3): CategoryMatch[] {
  const needle = text.trim().toLowerCase();
  if (needle.length < 2) return [];
  const matches: CategoryMatch[] = [];
  for (const [propertyType, labels] of Object.entries(CATEGORY_LABELS) as [PropertyType, readonly string[]][]) {
    if (labels.some((label) => label.toLowerCase().includes(needle) || needle.includes(label.toLowerCase()))) {
      matches.push({ propertyType, label: labels[0]! });
    }
  }
  return matches.slice(0, limit);
}
