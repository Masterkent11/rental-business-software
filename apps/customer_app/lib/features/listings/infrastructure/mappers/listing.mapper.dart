import '../../domain/entities/listing.entity.dart';
import '../../domain/entities/move_in_cost.entity.dart';
import '../../domain/rules/move_in_cost.rules.dart';
import '../../domain/value_objects/listing_kind.value_object.dart';
import '../../domain/value_objects/resource_type.value_object.dart';
import '../dto/listing.dto.dart';

abstract final class ListingMapper {
  static Listing fromDto(ListingDto dto) {
    final kind = switch (dto.kind) {
      'SHORT_TERM' => ListingKind.shortTerm,
      _ => ListingKind.longTerm,
    };

    final resourceType = switch (dto.resourceType) {
      'ROOM' => ResourceType.room,
      'BED_SPACE' => ResourceType.bedSpace,
      'PARKING' => ResourceType.parking,
      'STORAGE' => ResourceType.storage,
      _ => ResourceType.unit,
    };

    MoveInCost? moveInCost;
    if (dto.moveInCost != null) {
      moveInCost = MoveInCost(
        lines: dto.moveInCost!.lines,
        totalCentavos: dto.moveInCost!.totalCentavos,
      );
    } else if (kind == ListingKind.longTerm) {
      moveInCost = MoveInCostRules.standard(
        monthlyRentCentavos: dto.priceCentavos,
        advanceMonths: dto.advanceMonths,
        depositMonths: dto.depositMonths,
        utilityDepositCentavos: dto.utilityDepositCentavos,
      );
    }

    return Listing(
      id: dto.id,
      resourceId: dto.resourceId,
      title: dto.title,
      propertyName: dto.propertyName,
      areaLabel: dto.areaLabel,
      cityLabel: dto.cityLabel,
      kind: kind,
      resourceType: resourceType,
      priceCentavos: dto.priceCentavos,
      availabilityLabel: dto.availabilityLabel,
      isAvailable: dto.isAvailable,
      hasTour: dto.hasTour,
      sceneCount: dto.sceneCount,
      photos: dto.photos,
      moveInCost: moveInCost,
      isFeatured: dto.isFeatured,
    );
  }
}

extension ListingDtoToDomainExtension on ListingDto {
  Listing toDomain() => ListingMapper.fromDto(this);
}
