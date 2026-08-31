import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/composition_root.dart';
import '../../../../core/design/glass.dart';
import '../../../../core/design/tokens.dart';
import '../../../listings/domain/entities/listing.entity.dart';
import '../../../listings/domain/entities/listing_detail.entity.dart';
import '../../domain/entities/tour.entity.dart';
import '../widgets/panorama_view.widget.dart';

final tourForResourceProvider = FutureProvider.family<Tour?, String>((ref, resourceId) async {
  final useCase = ref.watch(getTourForResourceUseCaseProvider);
  return useCase.call(resourceId);
});

class TourScreen extends ConsumerStatefulWidget {
  const TourScreen({
    required this.listingId,
    this.listing,
    this.detail,
    super.key,
  });

  final String listingId;
  final Listing? listing;
  final ListingDetail? detail;

  @override
  ConsumerState<TourScreen> createState() => _TourScreenState();
}

class _TourScreenState extends ConsumerState<TourScreen> {
  TourScene? _currentScene;

  void _onHotspotTapped(TourHotspot hotspot, List<TourScene> scenes) {
    if (hotspot.kind == HotspotKind.navigation && hotspot.targetSceneId != null) {
      final target = scenes.firstWhere(
        (s) => s.id == hotspot.targetSceneId,
        orElse: () => _currentScene!,
      );
      setState(() => _currentScene = target);
    } else if (hotspot.title != null || hotspot.description != null) {
      showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: Text(hotspot.title ?? 'Hotspot Info'),
          content: Text(hotspot.description ?? ''),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final resourceId = widget.listing?.resourceId.isNotEmpty == true
        ? widget.listing!.resourceId
        : widget.listingId;
    final tourAsync = ref.watch(tourForResourceProvider(resourceId));

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: Padding(
          padding: const EdgeInsets.all(8.0),
          child: GlassContainer(
            padding: EdgeInsets.zero,
            borderRadius: Tokens.borderFull,
            child: IconButton(
              icon: const Icon(Icons.arrow_back, size: 20),
              onPressed: () => context.pop(),
            ),
          ),
        ),
        title: _currentScene != null
            ? GlassContainer(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                borderRadius: Tokens.borderLg,
                child: Text(
                  _currentScene!.label,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              )
            : null,
      ),
      body: tourAsync.when(
        data: (tour) {
          final scenes = tour?.scenes ?? [];
          if (scenes.isEmpty) {
            return const Center(child: Text('No 360° tour available'));
          }

          _currentScene ??= tour?.entryScene ?? scenes.first;

          return Stack(
            children: [
              PanoramaView(
                scene: _currentScene!,
                onHotspotTapped: (h) => _onHotspotTapped(h, scenes),
              ),
              Positioned(
                bottom: 24,
                left: 0,
                right: 0,
                child: SizedBox(
                  height: 60,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
                    scrollDirection: Axis.horizontal,
                    itemCount: scenes.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final s = scenes[index];
                      final isSelected = s.id == _currentScene?.id;

                      return ChoiceChip(
                        label: Text(s.label),
                        selected: isSelected,
                        onSelected: (_) => setState(() => _currentScene = s),
                      );
                    },
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error loading tour: $err')),
      ),
    );
  }
}
