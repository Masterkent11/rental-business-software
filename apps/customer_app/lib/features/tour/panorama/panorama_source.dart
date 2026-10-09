import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';

import '../../../data/tour_repository.dart';

enum PanoramaQuality { none, preview, tiles }

class PanoramaSource extends ChangeNotifier {
  PanoramaSource({required this.scene, ImageLoader? loader}) : _load = loader ?? _defaultLoader;

  final TourSceneApiView scene;
  final ImageLoader _load;

  ui.Image? _image;
  PanoramaQuality _quality = PanoramaQuality.none;
  int _level = -1;
  Object? _error;
  bool _disposed = false;

  ui.Image? get image => _image;
  PanoramaQuality get quality => _quality;

  int get level => _level;
  Object? get error => _error;

  bool get hasPixels => _image != null;

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
      if (_quality == PanoramaQuality.none) {
        _replace(image, PanoramaQuality.preview, -1);
      } else {
        image.dispose();
      }
    } catch (error) {
      if (_quality == PanoramaQuality.none) _error = error;
    }
  }

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
      if (_quality == PanoramaQuality.tiles && level <= _level) {
        composed.dispose();
        return;
      }
      _replace(composed, PanoramaQuality.tiles, level);
    } catch (error) {
      if (!hasPixels) _error = error;
      if (!_disposed) notifyListeners();
    } finally {
      _loading.remove(level);
    }
  }

  final Set<int> _loading = <int>{};

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
