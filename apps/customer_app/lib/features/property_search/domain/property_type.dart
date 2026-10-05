enum PropertyType {
  apartment,
  condo,
  house,
  room,
  boardingHouse;

  static PropertyType? tryParse(String? value) {
    if (value == null) return null;
    final lower = value.toLowerCase().replaceAll('-', '').replaceAll('_', '');
    for (final type in PropertyType.values) {
      if (type.name.toLowerCase() == lower) {
        return type;
      }
    }
    return null;
  }
}

extension PropertyTypeDisplay on PropertyType {
  String get label => switch (this) {
        PropertyType.apartment => 'Apartment',
        PropertyType.condo => 'Condo',
        PropertyType.house => 'House',
        PropertyType.room => 'Room',
        PropertyType.boardingHouse => 'Boarding House',
      };

  String get pluralLabel => switch (this) {
        PropertyType.apartment => 'Apartments',
        PropertyType.condo => 'Condos',
        PropertyType.house => 'Houses',
        PropertyType.room => 'Rooms',
        PropertyType.boardingHouse => 'Boarding Houses',
      };

  String get searchCtaLabel => 'Search $pluralLabel';
}
