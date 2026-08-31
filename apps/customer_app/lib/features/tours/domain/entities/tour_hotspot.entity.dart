enum HotspotKind { navigation, info, image, video }

/// Domain entity representing an interactive hotspot in a 360 scene.
class TourHotspot {
  const TourHotspot({
    required this.id,
    required this.kind,
    required this.yaw,
    required this.pitch,
    this.targetSceneId,
    this.title,
    this.description,
  });

  final String id;
  final HotspotKind kind;
  final double yaw;
  final double pitch;
  final String? targetSceneId;
  final String? title;
  final String? description;
}
