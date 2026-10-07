abstract final class OccupancyLimits {
  static const int minGuests = 1;
  static const int maxGuests = 16;
  static const int minChildren = 0;
  static const int maxChildren = 10;
  static const int minOccupants = 1;
  static const int maxOccupants = 16;

  static bool isValidGuests(int guests) =>
      guests >= minGuests && guests <= maxGuests;

  static bool isValidOccupants(int occupants) =>
      occupants >= minOccupants && occupants <= maxOccupants;
}
