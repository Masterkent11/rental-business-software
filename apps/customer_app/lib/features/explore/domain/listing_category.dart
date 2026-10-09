import 'package:flutter/material.dart';

enum MarketIntent {
  rent('Rent', 'RENT'),
  buy('Buy', 'SALE');

  const MarketIntent(this.label, this.apiValue);

  final String label;
  final String apiValue;

  static MarketIntent? tryParse(String? value) => switch (value?.toLowerCase()) {
        'rent' => MarketIntent.rent,
        'buy' || 'sale' => MarketIntent.buy,
        _ => null,
      };
}

enum ListingCategory {
  apartment(
    label: 'Apartment',
    plural: 'Apartments',
    apiValue: 'APARTMENT',
    icon: Icons.apartment_outlined,
    image: 'assets/images/categories/apartment.jpg',
    intents: {MarketIntent.rent},
  ),
  condo(
    label: 'Condo',
    plural: 'Condos',
    apiValue: 'CONDO',
    icon: Icons.domain_outlined,
    image: 'assets/images/categories/condo.jpg',
    intents: {MarketIntent.rent, MarketIntent.buy},
  ),
  house(
    label: 'House',
    plural: 'Houses',
    apiValue: 'HOUSE',
    icon: Icons.house_outlined,
    image: 'assets/images/categories/house.jpg',
    intents: {MarketIntent.rent, MarketIntent.buy},
  ),
  room(
    label: 'Room',
    plural: 'Rooms',
    apiValue: 'ROOM',
    icon: Icons.bed_outlined,
    image: 'assets/images/categories/room.jpg',
    intents: {MarketIntent.rent},
  ),
  boardingHouse(
    label: 'Boarding House',
    plural: 'Boarding Houses',
    apiValue: 'BOARDING_HOUSE',
    icon: Icons.groups_2_outlined,
    image: 'assets/images/categories/boarding_house.jpg',
    intents: {MarketIntent.rent},
  ),
  townhouse(
    label: 'Townhouse',
    plural: 'Townhouses',
    apiValue: 'TOWNHOUSE',
    icon: Icons.holiday_village_outlined,
    image: 'assets/images/categories/townhouse.jpg',
    intents: {MarketIntent.buy},
  ),
  lot(
    label: 'Lot',
    plural: 'Lots',
    apiValue: 'LOT',
    icon: Icons.landscape_outlined,
    image: 'assets/images/categories/lot.jpg',
    intents: {MarketIntent.buy},
  ),
  commercial(
    label: 'Commercial',
    plural: 'Commercial Properties',
    apiValue: 'COMMERCIAL',
    icon: Icons.storefront_outlined,
    image: 'assets/images/categories/commercial.jpg',
    intents: {MarketIntent.buy},
  );

  const ListingCategory({
    required this.label,
    required this.plural,
    required this.apiValue,
    required this.icon,
    required this.image,
    required this.intents,
  });

  final String label;
  final String plural;
  final String apiValue;
  final IconData icon;
  final String image;
  final Set<MarketIntent> intents;

  static const String exploreImage = 'assets/images/categories/explore.jpg';

  bool supports(MarketIntent intent) => intents.contains(intent);

  MarketIntent get defaultIntent => supports(MarketIntent.rent) ? MarketIntent.rent : MarketIntent.buy;

  String labelFor(MarketIntent intent) => this == house && intent == MarketIntent.buy ? 'House & Lot' : label;

  static ListingCategory? tryParse(String? value) {
    if (value == null) return null;
    final key = value.toLowerCase().replaceAll(RegExp(r'[-_\s]'), '');
    for (final category in values) {
      if (category.name.toLowerCase() == key || category.apiValue.toLowerCase().replaceAll('_', '') == key) {
        return category;
      }
    }
    return null;
  }

  static const List<ListingCategory> _buyOrder = [house, condo, townhouse, lot, commercial];

  static List<ListingCategory> forIntent(MarketIntent intent) => intent == MarketIntent.buy
      ? _buyOrder
      : values.where((category) => category.supports(MarketIntent.rent)).toList(growable: false);
}
