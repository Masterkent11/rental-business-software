import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';

import '../../../data/tour_repository.dart';

/// How sharp the panorama currently is.
enum PanoramaQuality {
  /// Nothing yet — the viewport is still empty.
  none,

  /// The kilobyte preview. Recognisable, soft, and on screen almost at once.
  preview,

  /// A tile level, composited. Higher is sharper.
  tiles,
}

/// Loads one room's pixels, coarse first.
///
/// This is the client half of ADR-0009. The pipeline exists so a customer sees
/// the room while the detail is still arriving, and the rule that makes that
/// true is here: **never wait for a better image before showing a worse one.**
///
/// It also never fetches the original panorama. The source is a 4.4 MB file
/// kept so tiles can be regenerated later; downloading it to look at a room
/// would defeat the entire pipeline.
class PanoramaSource extends ChangeNotifier {
  PanoramaSource({required this.scene, ImageLoader? loader})
      : _load = loader ?? _defaultLoader;

  final TourSceneApiView scene;
  final ImageLoader _load;

  ui.Image? _image;
  PanoramaQuality _quality = PanoramaQuality.none;
  int _level = -1;
  Object? _error;
  bool _disposed = false;

  /// The texture to draw. Null until the first pixels land.
  ui.Image? get image => _image;
  PanoramaQuality get quality => _quality;

  /// Which tile level is on screen, or -1 for none.
  int get level => _level;
  Object? get error => _error;

  /// True once there is something to look at, however soft.
  bool get hasPixels => _image != null;

  /// Fetch the preview, then the coarsest tile level.
  ///
  /// Level 0 is two tiles and about 22 KB; it is the first genuinely usable
  /// view and is loaded straight away. Sharper levels wait for the customer to
  /// zoom, because level 2 is nearly 3 MB and most people never zoom that far.
  Future<void> start() async {
    await _loadPreview();
    if (_disposed) return;
    await ensureLevel(0);
  }

  Future<void> _loadPreview() async {
    final url = scene.previewUrl;
    if (url == null) return;

    try {
      final image = await _load(url);
      if (_disposed) {
        image.dispose();
        return;
      }
      // Only if nothing better has arrived while this was in flight.
      if (_quality == PanoramaQuality.none) {
        _replace(image, PanoramaQuality.preview, -1);
      } else {
        image.dispose();
      }
    } catch (error) {
      // A missing preview is survivable — the tiles are the real image, and
      // failing the whole room over its thumbnail would be worse.
      if (_quality == PanoramaQuality.none) _error = error;
    }
  }

  /// Load and composite one tile level, if it is better than what is shown.
  Future<void> ensureLevel(int level) async {
    if (_disposed) return;
    if (level < 0 || level >= scene.tileLevels) return;
    if (_quality == PanoramaQuality.tiles && level <= _level) return;
    if (_loading.contains(level)) return;

    _loading.add(level);
    try {
      final composed = await _composeLevel(level);
      if (composed == null) return;

      if (_disposed) {
        composed.dispose();
        return;
      }
      // A slower, coarser level may finish after a sharper one. Discard it
      // rather than letting the view go backwards.
      if (_quality == PanoramaQuality.tiles && level <= _level) {
        composed.dispose();
        return;
      }
      _replace(composed, PanoramaQuality.tiles, level);
    } catch (error) {
      // Keep whatever is on screen. A failed refinement is not a failed room.
      if (!hasPixels) _error = error;
      if (!_disposed) notifyListeners();
    } finally {
      _loading.remove(level);
    }
  }

  final Set<int> _loading = <int>{};

  /// Stitch a level's tiles into one texture the shader can sample.
  ///
  /// The shader needs a single equirectangular image, so the tiles are drawn
  /// into one canvas. Level 0 is two 512px tiles; level 2 is thirty-two, which
  /// is why it is only fetched on demand.
  Future<ui.Image?> _composeLevel(int level) async {
    final width = 1024 << level;
    final height = width ~/ 2;
    const tileSize = 512;

    final columns = (width / tileSize).ceil();
    final rows = (height / tileSize).ceil();

    final futures = <Future<(int, int, ui.Image)>>[];
    for (var y = 0; y < rows; y += 1) {
      for (var x = 0; x < columns; x += 1) {
        final url = scene.tileUrl(level: level, x: x, y: y);
        if (url == null) return null;
        futures.add(_load(url).then((image) => (x, y, image)));
      }
    }

    final tiles = await Future.wait(futures);

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final paint = Paint()..filterQuality = FilterQuality.low;

    for (final (x, y, tile) in tiles) {
      canvas.drawImage(
        tile,
        Offset(x * tileSize.toDouble(), y * tileSize.toDouble()),
        paint,
      );
    }

    final picture = recorder.endRecording();
    final composed = await picture.toImage(width, height);
    picture.dispose();
    for (final entry in tiles) {
      entry.$3.dispose();
    }

    return composed;
  }

  void _replace(ui.Image next, PanoramaQuality quality, int level) {
    // Decoded panoramas are megabytes of GPU memory. Dropping the old one
    // immediately is what keeps a five-room walkthrough from accumulating
    // them on a phone.
    _image?.dispose();
    _image = next;
    _quality = quality;
    _level = level;
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _image?.dispose();
    _image = null;
    super.dispose();
  }
}

/// Fetches and decodes one image. Injected so tests need no network.
typedef ImageLoader = Future<ui.Image> Function(String url);

Future<ui.Image> _defaultLoader(String url) async {
  final provider = NetworkImage(url);
  final stream = provider.resolve(ImageConfiguration.empty);
  final completer = Completer<ui.Image>();

  late final ImageStreamListener listener;
  listener = ImageStreamListener(
    (info, _) {
      if (!completer.isCompleted) completer.complete(info.image);
      stream.removeListener(listener);
    },
    onError: (error, stack) {
      if (!completer.isCompleted) completer.completeError(error, stack);
      stream.removeListener(listener);
    },
  );

  stream.addListener(listener);
  return completer.future;
}
