import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/listing_repository.dart';
import '../../data/tour_repository.dart';
import '../../design/app_image.dart';
import '../../design/glass.dart';
import '../../design/tokens.dart';
import 'panorama/panorama_source.dart';
import 'panorama/panorama_view.dart';

class TourScreen extends ConsumerStatefulWidget {
  const TourScreen({required this.listingId, super.key});

  final String listingId;

  @override
  ConsumerState<TourScreen> createState() => _TourScreenState();
}

class _TourScreenState extends ConsumerState<TourScreen> {
  String? _sceneId;
  PanoramaSource? _source;
  PanoramaCamera _camera = const PanoramaCamera();
  bool _hasLooked = false;
  bool _walking = false;
  bool _fullscreen = false;

  @override
  void dispose() {
    _source?.dispose();
    super.dispose();
  }

  void _open(TourSceneApiView scene) {
    final previous = _source;

    final source = _sourceFor(scene);
    setState(() {
      _sceneId = scene.id;
      _source = source;
      _camera = startingCamera(scene);
      _walking = true;
    });

    previous?.dispose();

    source.start();
  }

  PanoramaSource _sourceFor(TourSceneApiView scene) {
    return PanoramaSource(
      scene: scene,
      loader: ref.read(panoramaImageLoaderProvider),
    )..addListener(_onPixels);
  }

  void _onPixels() {
    if (!mounted) return;
    setState(() {
      if (_source?.hasPixels ?? false) _walking = false;
    });
  }

  void _onCamera(PanoramaCamera camera) {
    setState(() {
      _camera = camera;
      _hasLooked = true;
    });

    final source = _source;
    if (source == null) return;

    final wanted = camera.zoom > 0.66 ? 2 : (camera.zoom > 0.25 ? 1 : 0);
    if (wanted > source.level) source.ensureLevel(wanted);
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(listingDetailProvider(widget.listingId));
    final resourceId = detail.valueOrNull?.card.resourceId;

    if (detail.isLoading) return const _TourLoading();
    if (detail.hasError) return const _TourUnavailable();
    if (resourceId == null || resourceId.isEmpty) return const _NoTour();

    final tourAsync = ref.watch(tourProvider(resourceId));

    return tourAsync.when(
      loading: () => const _TourLoading(),
      error: (_, __) => const _TourUnavailable(),
      data: (tour) {
        if (tour == null) return const _NoTour();

        final entry = tour.entryScene;
        if (entry == null) return const _NoTour();

        final scene = tour.sceneById(_sceneId ?? entry.id) ?? entry;

        if (_source == null) {
          _sceneId = entry.id;
          _camera = startingCamera(entry);
          _source = _sourceFor(entry)..start();
        }

        final source = _source;

        return Scaffold(
          backgroundColor: Colors.black,
          body: Stack(
            fit: StackFit.expand,
            children: [
              if (source != null)
                _PanoramaLayer(
                  key: ValueKey(scene.id),
                  source: source,
                  scene: scene,
                  camera: _camera,
                  onCamera: _onCamera,
                  onInteraction: () {
                    if (!_hasLooked) setState(() => _hasLooked = true);
                  },
                  onNavigate: (targetId) {
                    final target = tour.sceneById(targetId);
                    if (target == null || !target.isWalkable) {
                      _sayUnavailable(context);
                      return;
                    }
                    HapticFeedback.selectionClick();
                    _open(target);
                  },
                  onInfo: (note) => _showNote(context, note),
                ),

              if (source == null || !source.hasPixels)
                _TourLoading(label: _walking ? scene.label : null),

              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: SafeArea(
                  bottom: false,
                  child: _TourNav(
                    title: '360° Virtual Tour',
                    onClose: () => Navigator.of(context).maybePop(),
                    currentRoom: scene.label,
                    counter: tour.scenes.isEmpty
                        ? null
                        : '${tour.scenes.indexOf(scene) + 1}/${tour.scenes.length}',
                    onRoomTap: () => _showScenePicker(context, tour, scene),
                    isFullscreen: _fullscreen,
                    onFullscreenToggle: () =>
                        setState(() => _fullscreen = !_fullscreen),
                  ),
                ),
              ),

              Positioned(
                right: Tokens.gutter,
                bottom: _fullscreen || tour.scenes.length <= 1 ? Tokens.s24 : 110,
                child: Glass.circle(
                  onTap: () => setState(() => _fullscreen = !_fullscreen),
                  child: Icon(
                    _fullscreen ? Icons.fullscreen_exit : Icons.crop_free,
                    size: 22,
                    color: Colors.white,
                  ),
                ),
              ),

              if (!_fullscreen)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: Tokens.s16),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (!_hasLooked) const _DragHint(),
                          if (tour.scenes.length > 1) ...[
                            const SizedBox(height: Tokens.s8),
                            SizedBox(
                              height: 84,
                              child: ListView.separated(
                                scrollDirection: Axis.horizontal,
                                physics: Tokens.scroll,
                                padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
                                itemCount: tour.scenes.length,
                                separatorBuilder: (_, __) => const SizedBox(width: Tokens.s12),
                                itemBuilder: (context, i) => _RoomChip(
                                  scene: tour.scenes[i],
                                  selected: tour.scenes[i].id == scene.id,
                                  onTap: () {
                                    if (tour.scenes[i].id == scene.id) return;
                                    if (!tour.scenes[i].isWalkable) {
                                      _sayUnavailable(context);
                                      return;
                                    }
                                    HapticFeedback.selectionClick();
                                    _open(tour.scenes[i]);
                                  },
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  void _sayUnavailable(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('That room is not ready yet.')),
    );
  }

  void _showNote(BuildContext context, String note) {
    HapticFeedback.selectionClick();
    showModalBottomSheet<void>(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(
          Tokens.gutter,
          Tokens.s8,
          Tokens.gutter,
          Tokens.s32,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'From the owner',
              style: Theme.of(context).textTheme.labelSmall,
            ),
            const SizedBox(height: Tokens.s8),
            Text(note, style: Theme.of(context).textTheme.headlineSmall),
          ],
        ),
      ),
    );
  }

  void _showScenePicker(
    BuildContext context,
    TourView tour,
    TourSceneApiView current,
  ) {
    HapticFeedback.selectionClick();
    showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            Tokens.gutter,
            Tokens.s8,
            Tokens.gutter,
            Tokens.s24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Jump to',
                style: Theme.of(sheetContext).textTheme.headlineSmall,
              ),
              const SizedBox(height: Tokens.s16),
              SizedBox(
                height: 112,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: Tokens.scroll,
                  itemCount: tour.scenes.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(width: Tokens.s12),
                  itemBuilder: (context, i) => _SceneThumb(
                    scene: tour.scenes[i],
                    selected: tour.scenes[i].id == current.id,
                    onTap: () {
                      Navigator.of(sheetContext).pop();
                      _open(tour.scenes[i]);
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PanoramaLayer extends StatelessWidget {
  const _PanoramaLayer({
    required this.source,
    required this.scene,
    required this.camera,
    required this.onCamera,
    required this.onInteraction,
    required this.onNavigate,
    required this.onInfo,
    super.key,
  });

  final PanoramaSource source;
  final TourSceneApiView scene;
  final PanoramaCamera camera;
  final ValueChanged<PanoramaCamera> onCamera;
  final VoidCallback onInteraction;
  final ValueChanged<String> onNavigate;
  final ValueChanged<String> onInfo;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);

        return Stack(
          fit: StackFit.expand,
          children: [
            PanoramaView(
              source: source,
              camera: camera,
              onCameraChanged: onCamera,
              onInteractionStart: onInteraction,
            ),

            const IgnorePointer(child: PhotoScrim(top: 0.42, bottom: 0.5)),

            for (final hotspot in scene.hotspots) _positioned(hotspot, size),
          ],
        );
      },
    );
  }

  Widget _positioned(TourHotspotView hotspot, Size size) {
    final at = projectHotspot(
      yawDegrees: hotspot.yaw,
      pitchDegrees: hotspot.pitch,
      camera: camera,
      size: size,
    );

    if (at == null) return const SizedBox.shrink();

    return Positioned(
      left: at.dx,
      top: at.dy,
      child: FractionalTranslation(
        translation: const Offset(-0.5, -0.5),
        child: _Hotspot(
          hotspot: hotspot,
          onTap: () {
            if (hotspot.isDoor) {
              onNavigate(hotspot.targetSceneId!);
            } else if (hotspot.label.isNotEmpty) {
              onInfo(hotspot.label);
            }
          },
        ),
      ),
    );
  }
}

class _Hotspot extends StatefulWidget {
  const _Hotspot({required this.hotspot, required this.onTap});

  final TourHotspotView hotspot;
  final VoidCallback onTap;

  @override
  State<_Hotspot> createState() => _HotspotState();
}

class _HotspotState extends State<_Hotspot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );
    if (widget.hotspot.isDoor) _pulse.repeat();
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isNav = widget.hotspot.isDoor;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        widget.onTap();
      },
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: Tokens.tap + 12,
            height: Tokens.tap + 12,
            child: Stack(
              alignment: Alignment.center,
              children: [
                if (isNav)
                  AnimatedBuilder(
                    animation: _pulse,
                    builder: (context, _) {
                      final t = Curves.easeOut.transform(_pulse.value);
                      return Container(
                        width: 43 + t * 20,
                        height: 43 + t * 20,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.28 * (1 - t)),
                          ),
                        ),
                      );
                    },
                  ),
                isNav
                    ? Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black.withValues(alpha: 0.5),
                          border: Border.all(color: Colors.white, width: 3.5),
                        ),
                        alignment: Alignment.center,
                        child: Container(
                          width: 14,
                          height: 14,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                          ),
                        ),
                      )
                    : const Glass.circle(
                        size: 34,
                        child: Icon(
                          Icons.info_outline,
                          size: 17,
                          color: Colors.white,
                        ),
                      ),
              ],
            ),
          ),
          if (isNav && widget.hotspot.label.isNotEmpty) ...[
            const SizedBox(height: Tokens.s4),
            Glass(
              padding: const EdgeInsets.symmetric(
                horizontal: Tokens.s12,
                vertical: 3,
              ),
              child: Text(
                widget.hotspot.label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                  letterSpacing: -0.1,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TourNav extends StatelessWidget {
  const _TourNav({
    required this.title,
    required this.onClose,
    this.currentRoom,
    this.counter,
    this.onRoomTap,
    this.isFullscreen = false,
    this.onFullscreenToggle,
  });

  final String title;
  final VoidCallback onClose;
  final String? currentRoom;
  final String? counter;
  final VoidCallback? onRoomTap;
  final bool isFullscreen;
  final VoidCallback? onFullscreenToggle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: Tokens.s16,
        vertical: Tokens.s8,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Glass.circle(
            onTap: onClose,
            child: const Icon(
              Icons.arrow_back_ios_new,
              size: 16,
              color: Colors.white,
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.2,
                ),
              ),
              if (currentRoom != null) ...[
                const SizedBox(height: Tokens.s4),
                GestureDetector(
                  onTap: onRoomTap,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: const BorderRadius.all(Tokens.rPill),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          currentRoom!,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (counter != null) ...[
                          const SizedBox(width: 5),
                          Text(
                            counter!,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.7),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                        const SizedBox(width: Tokens.s4),
                        const Icon(
                          Icons.keyboard_arrow_down,
                          size: 16,
                          color: Colors.white,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
          Glass.circle(
            onTap: onFullscreenToggle,
            child: Icon(
              isFullscreen ? Icons.fullscreen_exit : Icons.fullscreen,
              size: 20,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

PanoramaCamera startingCamera(TourSceneApiView scene) {
  const toRadians = math.pi / 180;
  return const PanoramaCamera().copyWith(
    yaw: scene.initialYaw * toRadians,
    pitch: -scene.initialPitch * toRadians,
    fov: scene.initialFov * toRadians,
  );
}

class _RoomChip extends StatelessWidget {
  const _RoomChip({required this.scene, required this.selected, required this.onTap});

  final TourSceneApiView scene;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: scene.label,
      child: GestureDetector(
        onTap: onTap,
        child: SizedBox(
          width: 82,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80,
                height: 58,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: selected ? Colors.white : Colors.transparent,
                    width: selected ? 2.5 : 0,
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(selected ? 7.5 : 10),
                  child: AppImage(
                    url: scene.thumbnailUrl ?? '',
                    fallbackIcon: Icons.threed_rotation,
                    seed: scene.label.length,
                  ),
                ),
              ),
              const SizedBox(height: 5),
              Text(
                scene.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: selected ? Colors.white : Colors.white70,
                  fontSize: 12,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}



class _SceneThumb extends StatelessWidget {
  const _SceneThumb({
    required this.scene,
    required this.selected,
    required this.onTap,
  });

  final TourSceneApiView scene;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 118,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 78,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(Tokens.rSm),
                border: Border.all(
                  color: selected
                      ? theme.colorScheme.primary
                      : Colors.transparent,
                  width: 2,
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(Tokens.rSm - 2),
                child: AppImage(
                  url: scene.thumbnailUrl ?? '',
                  fallbackIcon: Icons.threed_rotation,
                  seed: scene.label.length,
                ),
              ),
            ),
            const SizedBox(height: Tokens.s6),
            Text(
              scene.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: selected
                  ? theme.textTheme.labelMedium
                  : theme.textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _DragHint extends StatefulWidget {
  const _DragHint();

  @override
  State<_DragHint> createState() => _DragHintState();
}

class _DragHintState extends State<_DragHint>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2600),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) => Transform.translate(
        offset: Offset(
          Tween<double>(
            begin: -6,
            end: 6,
          ).chain(CurveTween(curve: Curves.easeInOut)).evaluate(_c),
          0,
        ),
        child: child,
      ),
      child: const Glass(
        padding: EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.swipe, size: 17, color: Colors.white),
            SizedBox(width: Tokens.s8),
            Text(
              'Drag to look around',
              style: TextStyle(
                color: Colors.white,
                fontSize: 13.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TourLoading extends StatelessWidget {
  const _TourLoading({this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              height: 28,
              width: 28,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white70,
              ),
            ),
            if (label != null) ...[
              const SizedBox(height: Tokens.s16),
              Text(
                label!,
                style: Theme.of(context).textTheme.titleMedium
                    ?.copyWith(color: Colors.white),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TourUnavailable extends StatelessWidget {
  const _TourUnavailable();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: const Text('Virtual Tour'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(Tokens.gutter),
          child: Text(
            'The tour could not be loaded. Check your connection and try again.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium
                ?.copyWith(color: Colors.white70),
          ),
        ),
      ),
    );
  }
}

class _NoTour extends StatelessWidget {
  const _NoTour();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Virtual Tour')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(Tokens.s32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.threed_rotation,
                size: 40,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: Tokens.s16),
              Text(
                'No tour for this listing yet',
                style: Theme.of(context).textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: Tokens.s8),
              Text(
                'The photos are all this owner has published so far.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
