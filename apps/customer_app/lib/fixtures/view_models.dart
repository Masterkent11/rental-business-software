import 'package:flutter/foundation.dart';

enum ListingKind {
  longTerm('Monthly'),
  shortTerm('Nightly');

  const ListingKind(this.label);
  final String label;
}

enum ResourceType {
  unit('Unit', 'Units'),
  room('Room', 'Rooms'),
  bedSpace('Bed space', 'Bed spaces'),
  parking('Parking', 'Parking'),
  storage('Storage', 'Storage');

  const ResourceType(this.label, this.plural);
  final String label;
  final String plural;
}

enum ListingIntent { rent, sale }

enum LocationPrecision { exact, approximate }

@immutable
class MapPoint {
  const MapPoint({required this.latitude, required this.longitude, required this.precision});

  final double latitude;
  final double longitude;
  final LocationPrecision precision;
}

@immutable
class FloorPlanView {
  const FloorPlanView({required this.id, required this.url, required this.label});

  final String id;
  final String url;
  final String label;
}

const String kPriceOnInquiry = 'Price available on inquiry';

enum HotspotKind { navigation, info, image, video }

@immutable
class HotspotView {
  const HotspotView({
    required this.kind,
    required this.x,
    required this.y,
    this.label,
    this.note,
    this.targetScene,
  });

  final HotspotKind kind;

  final double x;
  final double y;

  final String? label;
  final String? note;
  final int? targetScene;
}

@immutable
class SceneView {
  const SceneView({
    required this.label,
    required this.imageUrl,
    this.hotspots = const [],
  });

  final String label;
  final String imageUrl;
  final List<HotspotView> hotspots;
}

@immutable
class MoveInCostView {
  const MoveInCostView({required this.lines, required this.totalCentavos});

  final List<({String label, int centavos})> lines;
  final int totalCentavos;
}

@immutable
class ListingCardView {
  const ListingCardView({
    required this.id,
    this.resourceId = '',
    required this.title,
    required this.propertyName,
    required this.areaLabel,
    required this.cityLabel,
    required this.kind,
    required this.resourceType,
    required this.priceCentavos,
    required this.availabilityLabel,
    required this.isAvailable,
    required this.hasTour,
    required this.sceneCount,
    required this.photos,
    this.moveInCost,
    this.isFeatured = false,
    this.rating,
    this.reviewCount,
    this.isVerified = false,
    this.beds = 1,
    this.baths = 1,
    this.sqm,
    this.isPopular = false,
    this.maxGuests = 1,
    this.cleaningFeeCentavos = 0,
    this.propertyType,
    this.minStayNights,
    this.minLeaseMonths,
    this.maxLeaseMonths,
    this.allowPendingIdentityApplication = false,
    this.intent = ListingIntent.rent,
    this.saleStatus,
    this.lotAreaSqm,
    this.parkingSlots = 0,
    this.distanceKm,
    this.location,
    this.tourProvider,
    this.furnishing,
    this.petsAllowed,
  });

  final String id;
  final String resourceId;
  final String title;
  final String propertyName;
  final String areaLabel;
  final String cityLabel;
  final ListingKind kind;
  final ResourceType resourceType;
  final int? priceCentavos;
  final String availabilityLabel;
  final bool isAvailable;
  final bool hasTour;
  final int sceneCount;
  final List<String> photos;
  final MoveInCostView? moveInCost;
  final bool isFeatured;
  final double? rating;
  final int? reviewCount;
  final bool isVerified;
  final int beds;
  final int baths;
  final int? sqm;
  final bool isPopular;
  final int maxGuests;
  final int cleaningFeeCentavos;
  final String? propertyType;
  final int? minStayNights;
  final int? minLeaseMonths;
  final int? maxLeaseMonths;
  final bool allowPendingIdentityApplication;
  final ListingIntent intent;
  final String? saleStatus;
  final int? lotAreaSqm;
  final int parkingSlots;
  final double? distanceKm;
  final MapPoint? location;
  final String? tourProvider;
  final String? furnishing;
  final bool? petsAllowed;

  String? get furnishingLabel => switch (furnishing) {
        'FURNISHED' => 'Furnished',
        'SEMI_FURNISHED' => 'Semi-furnished',
        'UNFURNISHED' => 'Unfurnished',
        _ => null,
      };

  bool get isSale => intent == ListingIntent.sale;

  bool get hasListedPrice => !isSale && priceCentavos != null;

  String get place => '$areaLabel, $cityLabel';

  String get typeLabel => switch (propertyType) {
        'APARTMENT' => 'Apartment',
        'CONDO' => 'Condo',
        'HOUSE' => isSale ? 'House & Lot' : 'House',
        'TOWNHOUSE' => 'Townhouse',
        'LOT' => 'Lot',
        'COMMERCIAL' => 'Commercial',
        'ROOM' => 'Room',
        'BOARDING_HOUSE' => 'Boarding house',
        _ => resourceType.label,
      };

  String get saleStatusLabel => switch (saleStatus) {
        'PRE_SELLING' => 'Pre-selling',
        'UNDER_CONSTRUCTION' => 'Under construction',
        _ => 'Ready for occupancy',
      };

  String? get distanceLabel {
    final km = distanceKm;
    if (km == null) return null;
    if (km < 1) return '${(km * 1000).round()} m away';
    return '${km < 10 ? km.toStringAsFixed(1) : km.round()} km away';
  }
}

@immutable
class ListingDetailView {
  const ListingDetailView({
    required this.card,
    required this.description,
    required this.amenities,
    required this.terms,
    required this.houseRules,
    required this.scenes,
    required this.ownerName,
    required this.ownerVerified,
    this.sharedFacilities = const [],
    this.minimumStayNights,
    this.blockedRanges = const [],
    this.floorPlans = const [],
  });

  final ListingCardView card;
  final String description;
  final List<String> amenities;
  final List<String> terms;
  final List<String> houseRules;
  final List<SceneView> scenes;

  final String ownerName;
  final bool ownerVerified;

  final List<String> sharedFacilities;

  final int? minimumStayNights;

  final List<({DateTime from, DateTime to})> blockedRanges;

  final List<FloorPlanView> floorPlans;
}

enum BookingStatus {
  active('Active'),
  past('Past'),
  cancelled('Cancelled');

  const BookingStatus(this.label);
  final String label;
}

@immutable
class BookingView {
  const BookingView({
    required this.id,
    required this.reference,
    required this.listingTitle,
    required this.propertyName,
    required this.areaLabel,
    required this.photo,
    required this.checkIn,
    required this.checkOut,
    required this.nights,
    required this.guests,
    required this.totalCentavos,
    required this.status,
    this.stateLabel,
    this.cancelledReason,
  });

  final String id;
  final String reference;
  final String listingTitle;
  final String propertyName;
  final String areaLabel;
  final String photo;

  final DateTime checkIn;

  final DateTime checkOut;

  final int nights;
  final int guests;
  final int totalCentavos;
  final BookingStatus status;

  final String? stateLabel;

  final String? cancelledReason;
}

enum ApplicationStatus {
  submitted('Submitted'),
  underReview('Under review'),
  approved('Approved'),
  rejected('Not this time'),
  withdrawn('Withdrawn'),
  expired('Offer expired');

  const ApplicationStatus(this.label);
  final String label;
}

@immutable
class ApplicationView {
  const ApplicationView({
    required this.id,
    required this.reference,
    required this.listingTitle,
    required this.propertyName,
    required this.areaLabel,
    required this.photo,
    required this.monthlyCentavos,
    required this.moveIn,
    required this.submittedAt,
    required this.status,
    required this.documents,
    this.decidedAt,
    this.reason,
    this.moveInCostCentavos,
    this.holdExpiresAt,
  });

  final String id;
  final String reference;
  final String listingTitle;
  final String propertyName;
  final String areaLabel;
  final String photo;
  final int monthlyCentavos;
  final DateTime moveIn;
  final DateTime submittedAt;
  final ApplicationStatus status;
  final List<String> documents;
  final DateTime? decidedAt;

  final String? reason;

  final int? moveInCostCentavos;

  final DateTime? holdExpiresAt;
}

enum FeaturedLens {
  popular('Popular'),
  nearby('Nearby'),
  recommendation('Recommendation');

  const FeaturedLens(this.label);
  final String label;
}
