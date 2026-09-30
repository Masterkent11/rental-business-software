import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/listing_repository.dart';
import '../../data/tour_repository.dart';
import '../../fixtures/view_models.dart';
import '../../design/app_image.dart';
import '../../design/glass.dart';
import '../../design/tokens.dart';
import 'panorama/panorama_source.dart';
import 'panorama/panorama_view.dart';

/// Virtual tour viewer.
///
/// The interaction model is unchanged from the design this screen has always
/// carried: drag to look, hotspots that walk you room to room, an always-
/// visible room label that opens the scene list, info notes, a clear way back,
/// and the path straight into booking or applying.
///
/// What changed is underneath. The flat photograph is gone; this now renders a
/// real equirectangular panorama through a GPU shader, fed by the tiled
/// pipeline from story 6.1 and the tour API from 6.2. Rooms, labels, and
/// hotspots all come from the tour data — nothing here is hard-coded.
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

  /// True while a room the customer chose is still finding its first pixels.
  bool _walking = false;

  @override
  void dispose() {
    _source?.dispose();
    super.dispose();
  }

  /// Open a room: swap the source, reset the view, and start loading.
  ///
  /// The camera resets to level and forward. Arriving in a new room already
  /// looking at the ceiling is disorienting, and the owner framed the panorama
  /// expecting you to enter facing its centre.
  void _open(TourSceneApiView scene) {
    final previous = _source;

    final source = _sourceFor(scene);
    setState(() {
      _sceneId = scene.id;
      _source = source;
      _camera = const PanoramaCamera();
      _walking = true;
    });

    // Disposed after the swap so the outgoing texture is released only once
    // nothing is drawing it.
    previous?.dispose();

    source.start();
  }

  /// A loader for one room, already listening for its first pixels.
  PanoramaSource _sourceFor(TourSceneApiView scene) {
    return PanoramaSource(
      scene: scene,
      loader: ref.read(panoramaImageLoaderProvider),
    )..addListener(_onPixels);
  }

  /// Repaint when the room's pixels change quality.
  ///
  /// Every notification, not only while walking: the entry room never sets
  /// `_walking`, so gating on it left the loading overlay up after the first
  /// pixels had arrived — covering the hotspots and swallowing taps. The source
  /// notifies a handful of times per room, so rebuilding on each is cheap.
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

    // Refine as the customer zooms in. Level 2 is nearly 3 MB, so it is only
    // fetched by somebody who has actually leaned in to look at something.
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
    // A failed listing fetch is a network fact, not "this owner has no tour"
    // — conflating the two would tell the customer something false about the
    // listing instead of about their connection.
    if (detail.hasError) return const _TourUnavailable();
    if (resourceId == null || resourceId.isEmpty) return const _NoTour();

    final tourAsync = ref.watch(tourProvider(resourceId));

    return tourAsync.when(
      loading: () => const _TourLoading(),
      error: (_, __) => const _TourUnavailable(),
      data: (tour) {
        if (tour == null) return const _NoTour();

        // The owner chose where the walkthrough opens. Picking a room here
        // would override a deliberate decision (I-07 requires an entry scene).
        final entry = tour.entryScene;
        if (entry == null) return const _NoTour();

        final scene = tour.sceneById(_sceneId ?? entry.id) ?? entry;

        // First build for this tour: open the entry room now, in this build,
        // rather than after a frame. Deferring it left the viewer with nothing
        // mounted until a later frame happened to arrive — which on a slow
        // first paint is exactly the black screen the pipeline exists to avoid.
        if (_source == null) {
          _sceneId = entry.id;
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
                    // A door to a room the API did not send is a door to
                    // nothing. I-07 should have stopped this reaching a
                    // customer; refusing quietly is better than a black screen.
                    if (target == null || !target.isWalkable) {
                      _sayUnavailable(context);
                      return;
                    }
                    HapticFeedback.selectionClick();
                    _open(target);
                  },
                  onInfo: (note) => _showNote(context, note),
                ),

              // Nothing to draw yet: the first pixels are still in flight.
              if (source == null || !source.hasPixels)
                _TourLoading(label: _walking ? scene.label : null),

              // Chrome. Everything below floats over the panorama on frosted
              // glass, never on an opaque bar.
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
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            // The room label is also the way into the scene
                            // list — the same affordance the design uses.
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
              Text('Jump to',
                  style: Theme.of(sheetContext).textTheme.headlineSmall),
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

/// The panorama, with the doors pinned to it.
///
/// Hotspots are projected from their bearing every frame, so they stay on the
/// door as the customer looks around — a hotspot that stayed put while the room
/// moved would break the illusion instantly.
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

            // A gentle vignette. Chrome sits top and bottom, and white text
            // over an unknown photograph needs help.
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

    // Behind the customer, or well off the edge: not drawn at all.
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

/// 43pt frosted circle with a white core, exactly as the reference draws it.
/// Navigation hotspots carry their destination underneath; info hotspots are a
/// smaller glyph, so the two are never confused mid-walkthrough.
class _Hotspot extends StatefulWidget {
  const _Hotspot({required this.hotspot, required this.onTap});

  final TourHotspotView hotspot;
  final VoidCallback onTap;

  @override
  State<_Hotspot> createState() => _HotspotState();
}

class _HotspotState extends State<_Hotspot>
    with SingleTickerProviderStateMixin {
  // Created in initState, not as a `late final` initialised on first use: an
  // info hotspot never reads it during build, so a lazy field would be
  // constructed *inside* dispose() — on an element that is already deactivated.
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

    // The whole thing is one target — circle *and* its label. Making only the
    // 43pt circle tappable looks fine on a desktop review and is miserable with
    // a thumb on a moving jeepney.
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
                            color: Colors.white.withOpacity(0.28 * (1 - t)),
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
              color: Colors.white.withOpacity(0.62),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: Tokens.s4),
          Icon(
            Icons.expand_less,
            size: 18,
            color: Colors.white.withOpacity(0.8),
          ),
        ],
      ),
    );
  }
}

/// The journey asks for a path straight from the tour into booking or applying.
/// Low emphasis on purpose — it must not compete with the room you are standing
/// in.
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
                  color:
                      selected ? theme.colorScheme.primary : Colors.transparent,
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
          Tween<double>(begin: -6, end: 6)
              .chain(CurveTween(curve: Curves.easeInOut))
              .evaluate(_c),
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

/// The journey names this as a normal state, not an error: a listing without a
/// tour falls back to photos rather than showing a broken viewer.
/// Waiting for the first pixels.
///
/// Named when walking to a room the customer chose, so the wait is attached to
/// something they did rather than being an anonymous spinner.
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
                  strokeWidth: 2, color: Colors.white70),
            ),
            if (label != null) ...[
              const SizedBox(height: Tokens.s16),
              Text(
                label!,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(color: Colors.white),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// The tour exists but could not be fetched.
///
/// Distinct from [_NoTour]: "this place has no tour" and "we could not load
/// the tour" are different facts, and showing the first when the second is
/// true tells the customer something untrue about the property.
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
            style: Theme.of(context)
                .textTheme
                .bodyMedium
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
