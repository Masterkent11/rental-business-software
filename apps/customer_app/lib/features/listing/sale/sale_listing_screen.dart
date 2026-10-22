import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../data/viewing_repository.dart';
import '../../../design/app_image.dart';
import '../../../design/glass.dart';
import '../../../design/osm_map.dart';
import '../../../design/tokens.dart';
import '../../../design/virtual_tour_action.dart';
import '../../../fixtures/view_models.dart';
import '../../auth/auth_guard.dart';
import '../../viewing/widgets/viewing_buttons.dart';
import '../../viewing/widgets/viewing_icon.dart';
import '../widgets/listing_attributes.dart';
import '../widgets/tour_callout_card.dart';

enum SaleTab {
  overview('Overview'),
  photos('Photos'),
  tour('360° Tour'),
  floorPlan('Floor Plan'),
  map('Map');

  const SaleTab(this.label);
  final String label;
}

class SaleListingView extends ConsumerStatefulWidget {
  const SaleListingView({
    required this.detail,
    required this.saved,
    required this.onToggleSave,
    super.key,
  });

  final ListingDetailView detail;
  final bool saved;
  final VoidCallback onToggleSave;

  @override
  ConsumerState<SaleListingView> createState() => _SaleListingViewState();
}

class _SaleListingViewState extends ConsumerState<SaleListingView> {
  SaleTab _tab = SaleTab.overview;
  int _photo = 0;

  ListingCardView get _card => widget.detail.card;

  void _guarded(String target, String reason) {
    if (!requireSignIn(context, ref, resumeTo: target, reason: reason)) return;
    HapticFeedback.selectionClick();
    context.push(target);
  }

  void _requestViewing(ViewingView? active) => _guarded(
        active == null ? Routes.viewing(_card.id) : Routes.viewingRequest(_card.id, active.id),
        'Sign in to request a viewing.',
      );

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final card = _card;
    final activeViewing = ref.watch(activeViewingForListingProvider(card.id));
    final availableTabs = [
      SaleTab.overview,
      SaleTab.photos,
      if (card.hasTour) SaleTab.tour,
      if (widget.detail.floorPlans.isNotEmpty) SaleTab.floorPlan,
      SaleTab.map,
    ];
    final activeTab = availableTabs.contains(_tab) ? _tab : SaleTab.overview;

    return Scaffold(
      backgroundColor: Tokens.canvas,
      body: CustomScrollView(
        physics: Tokens.scroll,
        slivers: [
          SliverToBoxAdapter(
            child: _Hero(
              card: card,
              index: _photo,
              onIndex: (i) => setState(() => _photo = i),
              saved: widget.saved,
              onToggleSave: widget.onToggleSave,
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s16, Tokens.gutter, Tokens.s8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(card.title,
                      style: theme.textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w700, color: Tokens.primaryNavy)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 16, color: Tokens.muted),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          [card.place, if (card.distanceLabel != null) card.distanceLabel!].join(' · '),
                          style: theme.textTheme.bodyMedium?.copyWith(color: Tokens.muted),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: Tokens.s12),
                  const _PriceOnInquiry(),
                  const SizedBox(height: Tokens.s16),
                  ListingAttributeStrip(card: card),
                ],
              ),
            ),
          ),
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabsHeader(
              tabs: availableTabs,
              selected: activeTab,
              onSelect: (t) => setState(() => _tab = t),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s20, Tokens.gutter, 140),
            sliver: SliverToBoxAdapter(
              child: switch (activeTab) {
                SaleTab.overview => _Overview(detail: widget.detail),
                SaleTab.photos => _PhotosTab(photos: card.photos),
                SaleTab.tour => _TourTab(card: card),
                SaleTab.floorPlan => _FloorPlanTab(plans: widget.detail.floorPlans),
                SaleTab.map => _MapTab(card: card),
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: _ActionBar(
        label: activeViewing == null ? 'Request a viewing' : 'View my viewing request',
        onPressed: () => _requestViewing(activeViewing),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({
    required this.card,
    required this.index,
    required this.onIndex,
    required this.saved,
    required this.onToggleSave,
  });

  final ListingCardView card;
  final int index;
  final ValueChanged<int> onIndex;
  final bool saved;
  final VoidCallback onToggleSave;

  @override
  Widget build(BuildContext context) {
    final photos = card.photos;
    return SizedBox(
      height: 340,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (photos.isEmpty)
            const AppImage(url: '', fallbackIcon: Icons.home_work_outlined, seed: 3)
          else
            PageView.builder(
              itemCount: photos.length,
              onPageChanged: onIndex,
              itemBuilder: (context, i) {
                final image = AppImage(url: photos[i], fallbackIcon: Icons.home_work_outlined, seed: i);
                return i == 0 ? Hero(tag: 'photo-${card.id}', child: image) : image;
              },
            ),
          const IgnorePointer(child: PhotoScrim(top: 0.3, bottom: 0.25)),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: Tokens.s16, vertical: Tokens.s8),
                child: Row(
                  children: [
                    Glass.circle(
                      onTap: () => Navigator.of(context).maybePop(),
                      child: const Icon(Icons.arrow_back_ios_new, size: 16, color: Colors.white),
                    ),
                    const Spacer(),
                    Semantics(
                      button: true,
                      label: saved ? 'Remove from saved' : 'Save property',
                      child: Glass.circle(
                        onTap: onToggleSave,
                        child: Icon(saved ? Icons.favorite : Icons.favorite_border, size: 18, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: Tokens.s8),
                    Glass.circle(
                      onTap: () {},
                      child: const Icon(Icons.share_outlined, size: 18, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (card.hasTour)
            Positioned(
              left: Tokens.s16,
              bottom: Tokens.s16,
              child: VirtualTourAction(
                title: '360°\u200b Tour',
                variant: VirtualTourActionVariant.dark,
                onTap: () => context.push(Routes.tour(card.id)),
              ),
            ),
          if (photos.isNotEmpty)
            Positioned(
              right: Tokens.s16,
              bottom: Tokens.s16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '${index + 1}/${photos.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _PriceOnInquiry extends StatelessWidget {
  const _PriceOnInquiry();

  void _showInfo(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: Tokens.canvas,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Tokens.rMd)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Private Pricing',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Tokens.primaryNavy,
                ),
              ),
              const SizedBox(height: Tokens.s8),
              const Text(
                'Sale prices are shared privately by the agent or owner after you submit a viewing request or inquiry.',
                style: TextStyle(fontSize: 14, height: 1.45, color: Tokens.muted),
              ),
              const SizedBox(height: Tokens.s20),
              ViewingPrimaryButton(
                label: 'Got it',
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _showInfo(context),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Flexible(
            child: Text(
              kPriceOnInquiry,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Tokens.muted,
              ),
            ),
          ),
          const SizedBox(width: 4),
          InkResponse(
            onTap: () => _showInfo(context),
            radius: 16,
            child: const Padding(
              padding: EdgeInsets.all(2),
              child: ViewingIcon(ViewingGlyph.info, size: 15, color: Tokens.muted),
            ),
          ),
        ],
      ),
    );
  }
}

class _TabsHeader extends SliverPersistentHeaderDelegate {
  _TabsHeader({required this.tabs, required this.selected, required this.onSelect});

  final List<SaleTab> tabs;
  final SaleTab selected;
  final ValueChanged<SaleTab> onSelect;

  @override
  double get minExtent => 52;

  @override
  double get maxExtent => 52;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Tokens.canvas,
      child: Column(
        children: [
          Expanded(
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter - 6),
              children: [
                for (final tab in tabs)
                  Semantics(
                    selected: tab == selected,
                    button: true,
                    child: InkWell(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        onSelect(tab);
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              tab.label,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: tab == selected ? FontWeight.w700 : FontWeight.w500,
                                color: tab == selected ? Tokens.primaryNavy : Tokens.muted,
                              ),
                            ),
                            const SizedBox(height: 6),
                            AnimatedContainer(
                              duration: Tokens.quick,
                              height: 2.5,
                              width: tab == selected ? 28 : 0,
                              decoration:
                                  BoxDecoration(color: Tokens.primaryNavy, borderRadius: BorderRadius.circular(2)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const Divider(height: 1, color: Tokens.hairline),
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _TabsHeader oldDelegate) => oldDelegate.selected != selected;
}

class _Overview extends StatefulWidget {
  const _Overview({required this.detail});

  final ListingDetailView detail;

  @override
  State<_Overview> createState() => _OverviewState();
}

class _OverviewState extends State<_Overview> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final card = widget.detail.card;
    final description = widget.detail.description.isEmpty ? 'No description yet.' : widget.detail.description;
    final isLong = description.length > 180;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (card.hasTour) ...[
          TourCalloutCard(card: card),
          const SizedBox(height: Tokens.s20),
        ],
        const SizedBox(height: Tokens.s24),
        Text('About this property', style: theme.textTheme.titleLarge),
        const SizedBox(height: Tokens.s8),
        Text(
          description,
          maxLines: _expanded || !isLong ? null : 3,
          overflow: _expanded || !isLong ? TextOverflow.clip : TextOverflow.ellipsis,
          style: theme.textTheme.bodyLarge,
        ),
        if (isLong) ...[
          const SizedBox(height: Tokens.s6),
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            behavior: HitTestBehavior.opaque,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _expanded ? 'Read less' : 'Read more',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Tokens.primaryNavy,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  _expanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                  size: 18,
                  color: Tokens.primaryNavy,
                ),
              ],
            ),
          ),
        ],
        if (widget.detail.amenities.isNotEmpty) ...[
          const SizedBox(height: Tokens.s24),
          Text('Features', style: theme.textTheme.titleLarge),
          const SizedBox(height: Tokens.s12),
          Wrap(
            spacing: Tokens.s8,
            runSpacing: Tokens.s8,
            children: [
              for (final feature in widget.detail.amenities)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Tokens.hairline),
                    color: Colors.white,
                  ),
                  child: Text(feature, style: theme.textTheme.bodyMedium),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _PhotosTab extends StatelessWidget {
  const _PhotosTab({required this.photos});

  final List<String> photos;

  @override
  Widget build(BuildContext context) {
    if (photos.isEmpty) {
      return const _TabEmpty(
          icon: Icons.photo_library_outlined,
          title: 'No photos yet',
          message: 'The agent or owner has not added photos.');
    }
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: photos.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2, mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 4 / 3),
      itemBuilder: (context, i) => GestureDetector(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(fullscreenDialog: true, builder: (_) => _PhotoViewer(photos: photos, initial: i)),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(Tokens.rSm),
          child: AppImage(url: photos[i], fallbackIcon: Icons.photo_outlined, seed: i),
        ),
      ),
    );
  }
}

class _PhotoViewer extends StatelessWidget {
  const _PhotoViewer({required this.photos, required this.initial, this.title = 'Photos'});

  final List<String> photos;
  final int initial;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white, title: Text(title)),
      body: PageView.builder(
        controller: PageController(initialPage: initial),
        itemCount: photos.length,
        itemBuilder: (context, i) => InteractiveViewer(
          maxScale: 5,
          child:
              Center(child: AppImage(url: photos[i], fallbackIcon: Icons.photo_outlined, seed: i, fit: BoxFit.contain)),
        ),
      ),
    );
  }
}

class _TourTab extends StatelessWidget {
  const _TourTab({required this.card});

  final ListingCardView card;

  @override
  Widget build(BuildContext context) {
    if (!card.hasTour) {
      return const _TabEmpty(
          icon: Icons.threed_rotation,
          title: 'No virtual tour yet',
          message: 'Ask the agent for a viewing, or check back later.');
    }
    return Column(
      children: [
        TourCalloutCard(
          card: card,
          onTap: () => context.push(Routes.tour(card.id)),
        ),
        const SizedBox(height: Tokens.s16),
        Container(
          padding: const EdgeInsets.all(Tokens.s16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(Tokens.rMd),
            border: Border.all(color: Tokens.hairline),
          ),
          child: Row(
            children: [
              const Icon(Icons.info_outline, color: Tokens.primaryNavy, size: 20),
              const SizedBox(width: Tokens.s12),
              Expanded(
                child: Text(
                  'Explore all ${card.sceneCount > 0 ? card.sceneCount : 1} rooms in high resolution 360° panoramic views.',
                  style: const TextStyle(fontSize: 13, color: Tokens.muted),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FloorPlanTab extends StatelessWidget {
  const _FloorPlanTab({required this.plans});

  final List<FloorPlanView> plans;

  @override
  Widget build(BuildContext context) {
    if (plans.isEmpty) {
      return const _TabEmpty(
          icon: Icons.grid_view_outlined,
          title: 'No floor plan yet',
          message: 'Ask the agent to share the floor plan in your inquiry.');
    }
    return Column(
      children: [
        for (var i = 0; i < plans.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: Tokens.s16),
            child: GestureDetector(
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  fullscreenDialog: true,
                  builder: (_) =>
                      _PhotoViewer(photos: [for (final p in plans) p.url], initial: i, title: 'Floor plans'),
                ),
              ),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(Tokens.rMd),
                  border: Border.all(color: Tokens.hairline),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(Tokens.rMd)),
                      child: AspectRatio(
                        aspectRatio: 4 / 3,
                        child: AppImage(
                            url: plans[i].url, fallbackIcon: Icons.grid_view_outlined, seed: i, fit: BoxFit.contain),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(Tokens.s12),
                      child: Row(
                        children: [
                          Expanded(
                              child: Text(plans[i].label,
                                  style: const TextStyle(fontWeight: FontWeight.w700, color: Tokens.primaryNavy))),
                          const Icon(Icons.zoom_in, color: Tokens.muted, size: 20),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _MapTab extends StatelessWidget {
  const _MapTab({required this.card});

  final ListingCardView card;

  @override
  Widget build(BuildContext context) {
    final location = card.location;
    if (location == null) {
      return const _TabEmpty(
          icon: Icons.map_outlined,
          title: 'Location not shared yet',
          message: 'The agent can share directions when you schedule a viewing.');
    }
    final approximate = location.precision == LocationPrecision.approximate;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        OsmMap(latitude: location.latitude, longitude: location.longitude, approximate: approximate, height: 280),
        const SizedBox(height: Tokens.s12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(approximate ? Icons.blur_circular : Icons.location_on_outlined, size: 18, color: Tokens.muted),
            const SizedBox(width: Tokens.s8),
            Expanded(
              child: Text(
                approximate
                    ? 'Approximate area in ${card.place}. The exact address is shared when your viewing is confirmed.'
                    : card.place,
                style: const TextStyle(fontSize: 13, color: Tokens.muted),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _TabEmpty extends StatelessWidget {
  const _TabEmpty({required this.icon, required this.title, required this.message});

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Tokens.s40),
      child: Column(
        children: [
          Icon(icon, size: 36, color: Tokens.muted),
          const SizedBox(height: Tokens.s12),
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Tokens.muted)),
        ],
      ),
    );
  }
}

class _ActionBar extends StatelessWidget {
  const _ActionBar({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Tokens.hairline)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s12, Tokens.gutter, Tokens.s12),
          child: ViewingPrimaryButton(
            label: label,
            glyph: ViewingGlyph.calendar,
            onPressed: onPressed,
          ),
        ),
      ),
    );
  }
}
