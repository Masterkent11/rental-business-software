import '../value_objects/listing_kind.value_object.dart';
import '../value_objects/resource_type.value_object.dart';
import 'move_in_cost.entity.dart';

/// Domain entity representing a listing summary preview card.
class Listing {
  const Listing({
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
  final MoveInCost? moveInCost;
  final bool isFeatured;

  String get location => '$areaLabel, $cityLabel';
}
