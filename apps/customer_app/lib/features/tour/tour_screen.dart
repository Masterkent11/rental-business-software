import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../design/app_image.dart';
import '../../design/glass.dart';
import '../../design/tokens.dart';
import '../../fixtures/sample_data.dart';
import '../../fixtures/view_models.dart';

/// Virtual tour viewer.
///
/// **What this is:** the interaction model of a tour, complete. Drag to look,
/// hotspots that walk you scene to scene, an always-visible room label, a scene
/// selector, info notes, and a clear way back — plus the path straight into
/// booking or applying that the customer journey asks for, because a customer
/// convinced by the tour should not have to hunt for the next step.
///
/// **What this is not:** a 360° renderer. A real panorama needs an
/// equirectangular projection, tiled delivery, and a decode budget that holds
/// on a mid-range Android phone over mobile data. That is its own integration
/// decision, and choosing a package for it now would settle it by accident.
/// A flat photograph panned horizontally stands in — the *feel* of looking
/// around is what is being proven here, and it is judgeable today.
class TourScreen extends StatefulWidget {
  const TourScreen({required this.listingId, super.key});

  final String listingId;

  @override
  State<TourScreen> createState() => _TourScreenState();
}

class _TourScreenState extends State<TourScreen> {
  int _index = 0;
  double _pan = 0;
  bool _hasLooked = false;

  /// How much wider the scene is than the viewport. The overhang is what there
  /// is to look around at.
  ///
  /// It also fixes where hotspots may sit: at 1.55x only the middle ~64% of a
  /// scene is visible before the user drags, so authored hotspots belong in
  /// x ∈ [0.18, 0.82]. One placed outside that band exists but cannot be found,
  /// which is worse than not placing it.
  static const double _overscan = 1.55;

  void _goToScene(int index) {
    HapticFeedback.lightImpact();
    setState(() {
      _index = index;
      _pan = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final scenes = SampleData.scenesFor(widget.listingId);
    final card = SampleData.cardById(widget.listingId);

    if (scenes.isEmpty || card == null) {
      return const _NoTour();
    }

    final scene = scenes[_index];
    final size = MediaQuery.sizeOf(context);
    final sceneWidth = size.width * _overscan;
    final maxPan = (sceneWidth - size.width) / 2;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          GestureDetector(
            onHorizontalDragUpdate: (details) => setState(() {
              _pan = (_pan + details.delta.dx).clamp(-maxPan, maxPan);
              _hasLooked = true;
            }),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 420),
              switchInCurve: Curves.easeOutCubic,
              transitionBuilder: (child, animation) => FadeTransition(
                opacity: animation,
                // A touch of scale so moving between scenes reads as stepping
                // forward rather than as a slide change.
                child: ScaleTransition(
                  scale: Tween<double>(begin: 1.06, end: 1).animate(animation),
                  child: child,
                ),
              ),
              child: _SceneLayer(
                key: ValueKey(_index),
                scene: scene,
                sceneWidth: sceneWidth,
                pan: _pan,
                onNavigate: (target) => _goToScene(target),
                onInfo: (note) => _showNote(context, note),
              ),
            ),
          ),

          // Chrome. Everything below floats over the photograph on frosted
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
                        // The room label is also the way into the scene list —
                        // the same affordance the reference mockup uses.
                        Flexible(
                          child: _RoomLabel(
                            label: scene.label,
                            position: '${_index + 1}/${scenes.length}',
                            onTap: () => _showScenePicker(context, scenes),
                          ),
                        ),
                        const SizedBox(width: Tokens.s8),
                        _NextStep(card: card),
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

  void _showScenePicker(BuildContext context, List<SceneView> scenes) {
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
              Text('Jump to', style: Theme.of(sheetContext).textTheme.headlineSmall),
              const SizedBox(height: Tokens.s16),
              SizedBox(
                height: 112,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: Tokens.scroll,
                  itemCount: scenes.length,
                  separatorBuilder: (_, __) => const SizedBox(width: Tokens.s12),
                  itemBuilder: (context, i) => _SceneThumb(
                    scene: scenes[i],
                    selected: i == _index,
                    onTap: () {
                      Navigator.of(sheetContext).pop();
                      _goToScene(i);
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

/// The photograph plus everything pinned to it. Hotspots live inside this layer
/// so they travel with the image when you look around — a hotspot that stayed
/// put while the room moved would break the illusion instantly.
class _SceneLayer extends StatelessWidget {
  const _SceneLayer({
    required this.scene,
    required this.sceneWidth,
    required this.pan,
    required this.onNavigate,
    required this.onInfo,
    super.key,
  });

  final SceneView scene;
  final double sceneWidth;
  final double pan;
  final ValueChanged<int> onNavigate;
  final ValueChanged<String> onInfo;

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height;

    return ClipRect(
      child: OverflowBox(
        maxWidth: sceneWidth,
        alignment: Alignment.center,
        child: Transform.translate(
          offset: Offset(pan, 0),
          child: SizedBox(
            width: sceneWidth,
            height: height,
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppImage(
                  url: scene.imageUrl,
                  fallbackIcon: Icons.threed_rotation,
                  seed: scene.label.length,
                ),
                // A gentle vignette. Chrome sits top and bottom, and white text
                // over an unknown photograph needs help.
                const PhotoScrim(top: 0.42, bottom: 0.5),
                for (final hotspot in scene.hotspots)
                  Positioned(
                    left: hotspot.x * sceneWidth,
                    top: hotspot.y * height,
                    child: FractionalTranslation(
                      translation: const Offset(-0.5, -0.5),
                      child: _Hotspot(
                        hotspot: hotspot,
                        onTap: () {
                          if (hotspot.kind == HotspotKind.navigation &&
                              hotspot.targetScene != null) {
                            onNavigate(hotspot.targetScene!);
                          } else if (hotspot.note != null) {
                            onInfo(hotspot.note!);
                          }
                        },
                      ),
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

/// 43pt frosted circle with a white core, exactly as the reference draws it.
/// Navigation hotspots carry their destination underneath; info hotspots are a
/// smaller glyph, so the two are never confused mid-walkthrough.
class _Hotspot extends StatefulWidget {
  const _Hotspot({required this.hotspot, required this.onTap});

  final HotspotView hotspot;
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
    if (widget.hotspot.kind == HotspotKind.navigation) _pulse.repeat();
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isNav = widget.hotspot.kind == HotspotKind.navigation;

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
          if (isNav && widget.hotspot.label != null) ...[
            const SizedBox(height: Tokens.s4),
            Glass(
              padding: const EdgeInsets.symmetric(
                horizontal: Tokens.s12,
                vertical: 3,
              ),
              child: Text(
                widget.hotspot.label!,
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
              size: 38,
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

  final SceneView scene;
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
                  color: selected ? theme.colorScheme.primary : Colors.transparent,
                  width: 2,
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(Tokens.rSm - 2),
                child: AppImage(
                  url: scene.imageUrl,
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
