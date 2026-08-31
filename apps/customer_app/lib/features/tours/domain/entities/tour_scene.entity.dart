import 'tour_hotspot.entity.dart';

/// Domain entity representing a room / scene in a 360 tour.
class TourScene {
  const TourScene({
    required this.id,
    required this.label,
    required this.position,
    required this.previewUrl,
    required this.thumbnailUrl,
    required this.tileUrlTemplate,
    required this.tileLevels,
    required this.hotspots,
  });

  final String id;
  final String label;
  final int position;
  final String? previewUrl;
  final String? thumbnailUrl;
  final String? tileUrlTemplate;
  final int tileLevels;
  final List<TourHotspot> hotspots;

  bool get isWalkable =>
      previewUrl != null || (tileUrlTemplate != null && tileLevels > 0);

  String? tileUrl({required int level, required int x, required int y}) {
    final template = tileUrlTemplate;
    if (template == null) return null;
    return template
        .replaceFirst('{level}', '$level')
        .replaceFirst('{x}', '$x')
        .replaceFirst('{y}', '$y');
  }
}
