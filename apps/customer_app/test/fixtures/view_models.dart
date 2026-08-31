import 'package:flutter/foundation.dart';

import 'package:customer_app/features/applications/domain/entities/rental_application.entity.dart';
import 'package:customer_app/features/bookings/domain/value_objects/booking_status.value_object.dart';
import 'package:customer_app/features/listings/domain/entities/listing.entity.dart';
import 'package:customer_app/features/listings/domain/entities/listing_detail.entity.dart';
import 'package:customer_app/features/listings/domain/entities/move_in_cost.entity.dart';

export 'package:customer_app/features/applications/domain/entities/rental_application.entity.dart';
export 'package:customer_app/features/applications/domain/value_objects/application_status.value_object.dart';
export 'package:customer_app/features/bookings/domain/value_objects/booking_status.value_object.dart';
export 'package:customer_app/features/discovery/domain/value_objects/featured_lens.value_object.dart';
export 'package:customer_app/features/listings/domain/entities/listing.entity.dart';
export 'package:customer_app/features/listings/domain/entities/listing_detail.entity.dart';
export 'package:customer_app/features/listings/domain/entities/move_in_cost.entity.dart';
export 'package:customer_app/features/listings/domain/value_objects/listing_kind.value_object.dart';
export 'package:customer_app/features/listings/domain/value_objects/resource_type.value_object.dart';

typedef ListingCardView = Listing;
typedef ListingDetailView = ListingDetail;
typedef MoveInCostView = MoveInCost;
typedef ApplicationView = RentalApplication;

enum HotspotKind { navigation, info, image, video }

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
