import 'package:flutter/foundation.dart';

/// PRESENTATION VIEW MODELS — NOT DOMAIN MODELS.
///
/// Nothing here is a domain entity. The domain model lives in `docs/03-domain/`
/// and is not frozen; this app deliberately does not encode it.
///
/// Two rules keep that honest:
///
///   * **Availability arrives already decided.** Occupancy has exactly one
///     source of truth, server-side (U-01). This app receives copy and blocked
///     nights; it never derives either from dates.
///   * **Money arrives already broken down.** Move-in cost is not computed here
///     from a rent figure — the arithmetic that matters is the server's.
///
/// These types are designed to be deleted once Step 5 defines real contracts.

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

/// What a hotspot does inside a tour scene. The four kinds V1 ships.
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

  /// Position within the scene, 0..1 of width and height. Real tours carry
  /// spherical coordinates; this is the flat stand-in.
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

/// The cost of actually getting in the door.
///
/// The customer journey is blunt about this: comparing bare monthly rent is
/// misleading in the Philippine market, where advance + deposit is typically
/// three months up front. An ₱8,500 unit costs ₱25,500 to enter, and the
/// listing must say so before anyone invests time in a viewing.
@immutable
class MoveInCostView {
  const MoveInCostView({
    required this.lines,
    required this.totalCentavos,
  });

  /// Label and amount, in the order they should be shown.
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
    this.sqm = 32,
    this.isPopular = false,
  });

  final String id;
  final String resourceId;
  final String title;
  final String propertyName;
  final String areaLabel;
  final String cityLabel;
  final ListingKind kind;
  final ResourceType resourceType;
  final int priceCentavos;
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
  final int sqm;
  final bool isPopular;

  String get location => '$areaLabel, $cityLabel';
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
  });

  final ListingCardView card;
  final String description;
  final List<String> amenities;
  final List<String> terms;
  final List<String> houseRules;
  final List<SceneView> scenes;

  /// The Organization behind the listing, and whether the platform has verified
  /// it. Verification gates publishing (D-11), so it is a fact worth surfacing.
  final String ownerName;
  final bool ownerVerified;

  /// For a bed space this is the whole question — what do I share, and with
  /// how many people.
  final List<String> sharedFacilities;

  final int? minimumStayNights;

  /// Nights already taken, as the server decided them. Inclusive start,
  /// exclusive end — the same half-open convention the domain uses.
  final List<({DateTime from, DateTime to})> blockedRanges;
}

/// Where a booking sits in its life.
///
/// Mirrors the short-term path only: a booking becomes a stay, the stay
/// completes, and the guest never becomes a tenant. There is no path from here
/// into a lease, and there is deliberately no field that would suggest one.
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

  /// Exclusive, like every interval in the domain: a checkout on the 29th
  /// frees the 29th.
  final DateTime checkOut;

  final int nights;
  final int guests;
  final int totalCentavos;
  final BookingStatus status;

  /// Server-decided copy — "Confirmed", "Checked in", "Completed". The client
  /// renders it and never derives it from dates.
  final String? stateLabel;

  final String? cancelledReason;
}

/// Where a long-term application has got to.
///
/// The weakest point in the whole funnel: the customer has committed effort and
/// is now waiting on someone else. Every state below is one the customer can be
/// *told* about, because being left to wonder is the failure.
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

  /// Required when rejected. A rejection with no reason sends the customer back
  /// to the start with nothing learned.
  final String? reason;

  /// Approved only — what is due to turn this into a lease.
  final int? moveInCostCentavos;

  /// Approved only. Approval places a hold, and the hold expires.
  final DateTime? holdExpiresAt;
}

/// What the featured row is showing.
///
/// A presentation grouping over fixture data, not a query. Ranking is the
/// server's job — "popular" means something specific (view counts, tour
/// completions) that this app has no business inventing.
enum FeaturedLens {
  popular('Popular'),
  nearby('Nearby'),
  recommendation('Recommendation');

  const FeaturedLens(this.label);
  final String label;
}
