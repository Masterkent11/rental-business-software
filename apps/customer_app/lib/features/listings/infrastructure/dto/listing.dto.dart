class MoveInCostDto {
  const MoveInCostDto({required this.lines, required this.totalCentavos});

  factory MoveInCostDto.fromJson(Map<dynamic, dynamic> json) {
    final lines = (json['lines'] as List<dynamic>? ?? const [])
        .whereType<Map>()
        .map((line) => (
              label: line['label'] as String? ?? '',
              centavos: (line['centavos'] as num?)?.toInt() ?? 0,
            ))
        .toList(growable: false);

    return MoveInCostDto(
      lines: lines,
      totalCentavos: (json['totalCentavos'] as num?)?.toInt() ?? 0,
    );
  }

  final List<({String label, int centavos})> lines;
  final int totalCentavos;
}

class ListingDto {
  const ListingDto({
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
    this.advanceMonths = 1,
    this.depositMonths = 2,
    this.utilityDepositCentavos = 0,
    this.isFeatured = false,
  });

  factory ListingDto.fromJson(Map<dynamic, dynamic> json) {
    final moveInJson = json['moveInCost'];
    final moveInCost = moveInJson is Map
        ? MoveInCostDto.fromJson(moveInJson)
        : null;

    return ListingDto(
      id: json['id'] as String? ?? '',
      resourceId: json['resourceId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      propertyName: json['propertyName'] as String? ?? '',
      areaLabel: json['areaLabel'] as String? ?? '',
      cityLabel: json['cityLabel'] as String? ?? '',
      kind: json['kind'] as String? ?? 'LONG_TERM',
      resourceType: json['resourceType'] as String? ?? 'UNIT',
      priceCentavos: (json['priceCentavos'] as num?)?.toInt() ?? 0,
      availabilityLabel:
          json['availabilityLabel'] as String? ?? 'Available now',
      isAvailable: json['isAvailable'] as bool? ?? true,
      hasTour: json['hasTour'] as bool? ?? false,
      sceneCount: (json['sceneCount'] as num?)?.toInt() ?? 0,
      photos: (json['photos'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false),
      moveInCost: moveInCost,
      advanceMonths: (json['advanceMonths'] as num?)?.toInt() ?? 1,
      depositMonths: (json['depositMonths'] as num?)?.toInt() ?? 2,
      utilityDepositCentavos:
          (json['utilityDepositCentavos'] as num?)?.toInt() ?? 0,
      isFeatured: json['isFeatured'] as bool? ?? false,
    );
  }

  final String id;
  final String resourceId;
  final String title;
  final String propertyName;
  final String areaLabel;
  final String cityLabel;
  final String kind;
  final String resourceType;
  final int priceCentavos;
  final String availabilityLabel;
  final bool isAvailable;
  final bool hasTour;
  final int sceneCount;
  final List<String> photos;
  final MoveInCostDto? moveInCost;
  final int advanceMonths;
  final int depositMonths;
  final int utilityDepositCentavos;
  final bool isFeatured;
}
