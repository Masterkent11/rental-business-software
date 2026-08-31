import 'tour_scene.entity.dart';

export 'tour_hotspot.entity.dart';
export 'tour_scene.entity.dart';

/// Domain entity representing a complete 360 virtual tour.
class Tour {
  const Tour({
    required this.id,
    required this.resourceId,
    required this.entrySceneId,
    required this.scenes,
  });

  final String id;
  final String resourceId;
  final String entrySceneId;
  final List<TourScene> scenes;

  TourScene? get entryScene {
    for (final s in scenes) {
      if (s.id == entrySceneId) return s;
    }
    return scenes.isNotEmpty ? scenes.first : null;
  }
}
