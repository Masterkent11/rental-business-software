import 'listing.entity.dart';

/// Full domain detail entity for one listing.
class ListingDetail {
  const ListingDetail({
    required this.card,
    required this.description,
    required this.amenities,
    required this.terms,
    required this.houseRules,
    required this.ownerName,
    required this.ownerVerified,
    this.scenes = const [],
    this.sharedFacilities = const [],
    this.minimumStayNights,
    this.blockedRanges = const [],
  });

  final Listing card;
  final String description;
  final List<String> amenities;
  final List<String> terms;
  final List<String> houseRules;
  final String ownerName;
  final bool ownerVerified;
  final List<dynamic> scenes;
  final List<String> sharedFacilities;
  final int? minimumStayNights;
  final List<({DateTime from, DateTime to})> blockedRanges;
}
