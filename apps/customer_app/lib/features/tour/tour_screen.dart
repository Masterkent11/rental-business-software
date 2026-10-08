import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../data/listing_repository.dart';
import '../../data/tour_repository.dart';
import '../../fixtures/view_models.dart';
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
        final matterport = tour.matterportUrl;
        if (matterport != null) return MatterportTour(url: matterport);

        final entry = tour.entryScene;
        if (entry == null) return const _NoTour();

        final scene = tour.sceneById(_sceneId ?? entry.id) ?? entry;

        if (_source == null) {
          _sceneId = entry.id;
          _camera = startingCamera(entry);
          _source = _sourceFor(entry)..start();
        }

        final card = detail.valueOrNull?.card;
        final index = tour.scenes.indexWhere((s) => s.id == scene.id);
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
                    title: 'Virtual Tour',
                    onClose: () => Navigator.of(context).maybePop(),
                  ),
                ),
              ),

              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(
                      Tokens.gutter,
                      0,
                      Tokens.gutter,
                      Tokens.s20,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (!_hasLooked) const _DragHint(),
                        const SizedBox(height: Tokens.s16),
                        if (tour.scenes.length > 1) ...[
                          SizedBox(
                            height: 64,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              physics: Tokens.scroll,
                              itemCount: tour.scenes.length,
                              separatorBuilder: (_, __) => const SizedBox(width: Tokens.s8),
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
                          const SizedBox(height: Tokens.s12),
                        ],
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: _RoomLabel(
                                label: scene.label,
                                position: '${index + 1}/${tour.scenes.length}',
                                onTap: () =>
                                    _showScenePicker(context, tour, scene),
                              ),
                            ),
                            const SizedBox(width: Tokens.s8),
                            if (card != null) _NextStep(card: card),
                          ],
                        ),
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
                Glass.circle(
                  size: isNav ? 43 : 34,
                  child: isNav
                      ? Container(
                          width: 13,
                          height: 13,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                        )
                      : const Icon(
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
  const _TourNav({required this.title, required this.onClose});

  final String title;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 17,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.2,
            ),
          ),
          Positioned(
            left: Tokens.s16,
            child: Glass.circle(
              onTap: onClose,
              child: const Icon(
                Icons.arrow_back_ios_new,
                size: 16,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RoomLabel extends StatelessWidget {
  const _RoomLabel({
    required this.label,
    required this.position,
    required this.onTap,
  });

  final String label;
  final String position;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Glass(
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(14, 9, 12, 9),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 1.6),
            ),
          ),
          const SizedBox(width: Tokens.s8),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w500,
                letterSpacing: -0.2,
              ),
            ),
          ),
          const SizedBox(width: Tokens.s8),
          Text(
            position,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.62),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: Tokens.s4),
          Icon(
            Icons.expand_less,
            size: 18,
            color: Colors.white.withValues(alpha: 0.8),
          ),
        ],
      ),
    );
  }
}

class _NextStep extends StatelessWidget {
  const _NextStep({required this.card});

  final ListingCardView card;

  @override
  Widget build(BuildContext context) {
    final isLongTerm = card.kind == ListingKind.longTerm;

    return Glass(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
      onTap: () => Navigator.of(context).maybePop(),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            isLongTerm ? 'Apply' : 'Book',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(width: Tokens.s6),
          const Icon(Icons.arrow_forward, size: 16, color: Colors.white),
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
        child: Container(
          width: 96,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(Tokens.rSm),
            border: Border.all(color: selected ? Colors.white : Colors.white24, width: selected ? 2 : 1),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(Tokens.rSm - 1),
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppImage(url: scene.thumbnailUrl ?? '', fallbackIcon: Icons.threed_rotation, seed: scene.label.length),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, Colors.black87],
                    ),
                  ),
                ),
                Positioned(
                  left: 6,
                  right: 6,
                  bottom: 5,
                  child: Text(
                    scene.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class MatterportTour extends StatefulWidget {
  const MatterportTour({required this.url, super.key});

  final Uri url;

  @override
  State<MatterportTour> createState() => _MatterportTourState();
}

class _MatterportTourState extends State<MatterportTour> {
  late final WebViewController _controller;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            final allowed = uri != null && uri.scheme == 'https' && (uri.host == 'my.matterport.com' || uri.host.endsWith('.matterport.com'));
            return allowed ? NavigationDecision.navigate : NavigationDecision.prevent;
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame ?? true) {
              if (mounted) setState(() => _failed = true);
            }
          },
        ),
      )
      ..loadRequest(widget.url);
  }

  void _retry() {
    setState(() {
      _failed = false;
      _loading = true;
    });
    _controller.loadRequest(widget.url);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (!_failed) WebViewWidget(controller: _controller),
          if (_loading && !_failed) const _TourLoading(),
          if (_failed)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(Tokens.s32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_off_outlined, color: Colors.white70, size: 36),
                    const SizedBox(height: Tokens.s12),
                    const Text(
                      'The 3D tour could not load. Check your connection and try again.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white),
                    ),
                    const SizedBox(height: Tokens.s16),
                    FilledButton(onPressed: _retry, child: const Text('Try again')),
                  ],
                ),
              ),
            ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: _TourNav(title: '3D Tour', onClose: () => Navigator.of(context).maybePop()),
            ),
          ),
        ],
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
