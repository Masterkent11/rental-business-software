import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/auth_repository.dart';
import '../../data/discovery_repository.dart';
import '../../data/listing_repository.dart';
import '../../design/app_image.dart';
import '../../design/glass.dart';
import '../../design/osm_map.dart';
import '../../design/tokens.dart';
import '../../design/virtual_tour_action.dart';
import '../../fixtures/view_models.dart';
import '../auth/auth_guard.dart';
import '../saved/saved_controller.dart';
import 'sale/sale_listing_screen.dart';
import 'listing_price.dart';
import 'widgets/tour_callout_card.dart';
import '../booking/booking_dates_screen.dart';
import 'widgets/rental_action_bar.dart';
import '../tour/tour_intro_screen.dart';
import 'widgets/listing_attributes.dart';

enum RentalTab {
  overview('Overview'),
  photos('Photos'),
  tour('360° Tour'),
  map('Map'),
  reviews('Reviews'),
  floorPlan('Floor Plan');

  const RentalTab(this.label);
  final String label;
}

class ListingDetailScreen extends ConsumerStatefulWidget {
  const ListingDetailScreen({required this.listingId, this.saveOnOpen = false, super.key});

  final String listingId;
  final bool saveOnOpen;

  @override
  ConsumerState<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends ConsumerState<ListingDetailScreen> {
  RentalTab _tab = RentalTab.overview;
  int _photoIndex = 0;
  QuoteRequest? _stay;
  bool _descriptionExpanded = false;
  final _scroll = ScrollController();
  final _tabOffsets = <RentalTab, double>{};

  void _selectTab(RentalTab tab) {
    _tabOffsets[_tab] = _scroll.hasClients ? _scroll.offset : 0;
    setState(() => _tab = tab);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _scroll.hasClients) {
        _scroll.jumpTo((_tabOffsets[tab] ?? 0).clamp(0, _scroll.position.maxScrollExtent));
      }
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _recordView());
    if (widget.saveOnOpen) {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted || ref.read(isSavedProvider(widget.listingId))) return;
        await ref.read(savedIdsProvider.future);
        if (mounted && !ref.read(isSavedProvider(widget.listingId))) _toggleSave(widget.listingId);
      });
    }
  }

  Future<void> _recordView() async {
    if (!mounted || !ref.read(isSignedInProvider)) return;
    try {
      await ref.read(discoveryRepositoryProvider).recordView(widget.listingId);
    } on ApiException {
      return;
    }
  }

  Future<void> _toggleSave(String id) async {
    if (!requireSignIn(
      context,
      ref,
      resumeTo: '${Routes.listing(id)}?save=1',
      reason: 'Sign in to save places to your account.',
    )) {
      return;
    }
    try {
      await ref.read(savedIdsProvider.notifier).toggle(id);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _shareListing(ListingCardView card) async {
    await Clipboard.setData(
        ClipboardData(text: [card.title, card.place, if (card.hasListedPrice) listingPriceLabel(card)].join('\n')));
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Listing details copied')));
  }

  Future<void> _selectDates(ListingCardView card) async {
    final selected = await showModalBottomSheet<QuoteRequest>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => FractionallySizedBox(
        heightFactor: .95,
        child: BookingDatesScreen(listingId: card.id, selectionOnly: true, initialSelection: _stay),
      ),
    );
    if (mounted && selected != null) setState(() => _stay = selected);
  }

  void _commit(ListingCardView card, bool isLongTerm) {
    final stay = _stay;
    if (!isLongTerm && stay == null) {
      _selectDates(card);
      return;
    }
    final target = isLongTerm
        ? Routes.apply(card.id)
        : Routes.checkout(
            listingId: card.id,
            resourceId: card.resourceId,
            checkIn: stay!.checkIn,
            checkOut: stay.checkOut,
            guests: stay.guests);
    if (!requireSignIn(
      context,
      ref,
      resumeTo: target,
      reason: isLongTerm ? 'Sign in to apply for this place.' : 'Sign in to book your stay.',
    )) {
      return;
    }
    HapticFeedback.mediumImpact();
    context.push(target);
  }

  void _openTour(ListingCardView card) {
    final hasSeen = ref.read(hasSeenTourIntroProvider);
    final isTest = WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');
    if (!hasSeen && !isTest) {
      context.push(Routes.tourIntro(card.id));
    } else {
      context.push(Routes.tour(card.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(listingDetailProvider(widget.listingId));

    return switch (async) {
      AsyncData(value: null) => const _NotFound(),
      AsyncError(:final error) => _DetailFailed(
          error: error,
          onRetry: () => ref.invalidate(listingDetailProvider(widget.listingId)),
        ),
      AsyncData(:final value) => _buildDetail(context, value!),
      _ => const _DetailLoading(),
    };
  }

  Widget _buildDetail(BuildContext context, ListingDetailView detail) {
    final card = detail.card;
    final theme = Theme.of(context);
    final isLongTerm = card.kind == ListingKind.longTerm;
    final saved = ref.watch(isSavedProvider(card.id));

    if (card.isSale) {
      return SaleListingView(detail: detail, saved: saved, onToggleSave: () => _toggleSave(card.id));
    }

    final availableTabs = [
      RentalTab.overview,
      RentalTab.photos,
      if (card.hasTour) RentalTab.tour,
      RentalTab.map,
      RentalTab.reviews,
      if (detail.floorPlans.isNotEmpty) RentalTab.floorPlan,
    ];
    final activeTab = availableTabs.contains(_tab) ? _tab : RentalTab.overview;

    return Scaffold(
      backgroundColor: Tokens.canvas,
      body: CustomScrollView(
        controller: _scroll,
        physics: Tokens.scroll,
        slivers: [
          SliverToBoxAdapter(
            child: _Gallery(
              photos: card.photos,
              heroTag: 'photo-${card.id}',
              index: _photoIndex,
              onIndex: (i) => setState(() => _photoIndex = i),
              fallbackIcon: Icons.apartment_outlined,
              saved: saved,
              onToggleSave: () => _toggleSave(card.id),
              onShare: () => _shareListing(card),
              hasTour: card.hasTour,
              onTapTour: () => _openTour(card),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s16, Tokens.gutter, Tokens.s8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    card.title,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: Tokens.primaryNavy,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 16, color: Tokens.muted),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          [card.place, if (card.propertyName.isNotEmpty) card.propertyName].join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: Tokens.muted,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: Tokens.s16),
                  ListingAttributeStrip(card: card, detailLayout: true, amenities: detail.amenities.take(3).toList()),
                ],
              ),
            ),
          ),
          SliverPersistentHeader(
            pinned: true,
            delegate: _RentalTabsHeader(
              tabs: availableTabs,
              selected: activeTab,
              onSelect: _selectTab,
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s20, Tokens.gutter, 140),
            sliver: SliverToBoxAdapter(
              child: switch (activeTab) {
                RentalTab.overview => _buildOverview(context, detail, card, isLongTerm),
                RentalTab.photos => _buildPhotos(card.photos),
                RentalTab.tour => _buildTour(card),
                RentalTab.map => _buildMap(card),
                RentalTab.reviews => _buildReviews(card),
                RentalTab.floorPlan => _buildFloorPlan(detail.floorPlans),
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: RentalActionBar(
        card: card,
        isLongTerm: isLongTerm,
        quote: _stay == null ? null : ref.watch(stayQuoteProvider(_stay!)),
        onSelectDates: () => _selectDates(card),
        onRetryQuote: () {
          if (_stay != null) ref.invalidate(stayQuoteProvider(_stay!));
        },
        onCommit: () => _commit(card, isLongTerm),
      ),
    );
  }

  Widget _buildOverview(BuildContext context, ListingDetailView detail, ListingCardView card, bool isLongTerm) {
    final theme = Theme.of(context);
    final showAvailability = !card.isAvailable;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (detail.description.isNotEmpty) ...[
          Text(detail.description,
              maxLines: _descriptionExpanded ? null : 3,
              overflow: _descriptionExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
              style: theme.textTheme.bodyLarge?.copyWith(color: Tokens.muted)),
          TextButton(
              onPressed: () => setState(() => _descriptionExpanded = !_descriptionExpanded),
              child: Text(_descriptionExpanded ? 'Read less' : 'Read more  ›')),
        ],
        if (showAvailability) ...[
          const SizedBox(height: Tokens.s16),
          _AvailabilityRow(card: card),
        ],
        if (card.hasTour) ...[
          TourCalloutCard(
            card: card,
            onTap: () => _openTour(card),
          ),
          const SizedBox(height: Tokens.s16),
        ],
        const _SectionGap(),
        if (detail.sharedFacilities.isNotEmpty)
          _Section(
            title: 'What you share',
            child: Column(
              children: [
                for (final item in detail.sharedFacilities) _Bullet(item, icon: Icons.group_outlined),
              ],
            ),
          ),
        _Section(
          title: 'What’s included',
          child: Wrap(
            spacing: Tokens.s8,
            runSpacing: Tokens.s8,
            children: [
              for (final amenity in detail.amenities) _Tag(amenity),
            ],
          ),
        ),
        _Section(
          title: isLongTerm ? 'Lease terms' : 'Stay terms',
          child: Column(
            children: [
              if (!isLongTerm && detail.minimumStayNights != null)
                _Bullet(
                  'Minimum stay: ${detail.minimumStayNights} nights',
                  icon: Icons.nights_stay_outlined,
                ),
              for (final term in detail.terms) _Bullet(term, icon: Icons.check),
            ],
          ),
        ),
        _Section(
          title: 'House rules',
          child: Column(
            children: [
              for (final rule in detail.houseRules) _Bullet(rule, icon: Icons.remove),
            ],
          ),
        ),
        _Section(
          title: 'Who you are renting from',
          child: _OwnerCard(
            name: detail.ownerName,
            verified: detail.ownerVerified,
          ),
        ),
      ],
    );
  }

  Widget _buildPhotos(List<String> photos) {
    if (photos.isEmpty) {
      return const _TabEmpty(
        icon: Icons.photo_library_outlined,
        title: 'No photos available',
        message: 'The host has not uploaded photos yet.',
      );
    }
    return Column(
      children: [
        for (int i = 0; i < photos.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: Tokens.s12),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(Tokens.rMd),
              child: AspectRatio(
                aspectRatio: 16 / 10,
                child: AppImage(
                  url: photos[i],
                  fallbackIcon: Icons.apartment_outlined,
                  seed: i,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildTour(ListingCardView card) {
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

  Widget _buildFloorPlan(List<FloorPlanView> plans) {
    if (plans.isEmpty) {
      return const _TabEmpty(
        icon: Icons.architecture_outlined,
        title: 'No floor plan available',
        message: 'The host has not added a floor plan for this rental.',
      );
    }
    return Column(
      children: [
        for (int i = 0; i < plans.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: Tokens.s16),
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
                    child: Text(plans[i].label,
                        style: const TextStyle(fontWeight: FontWeight.w700, color: Tokens.primaryNavy)),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildMap(ListingCardView card) {
    final location = card.location;
    if (location == null) {
      return const _TabEmpty(
        icon: Icons.map_outlined,
        title: 'Location not shared yet',
        message: 'The host can share directions once your stay is confirmed.',
      );
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
                approximate ? 'Approximate location for guest safety. Exact address given upon booking.' : card.place,
                style: const TextStyle(fontSize: 13, color: Tokens.muted),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildReviews(ListingCardView card) {
    if (card.rating == null || (card.reviewCount ?? 0) == 0) {
      return const _TabEmpty(
          icon: Icons.rate_review_outlined,
          title: 'No reviews yet',
          message: 'Reviews will appear here after verified stays.');
    }
    return Text('${card.rating} · ${card.reviewCount} reviews', style: Theme.of(context).textTheme.titleMedium);
  }
}

class _Gallery extends StatelessWidget {
  const _Gallery({
    required this.photos,
    required this.heroTag,
    required this.index,
    required this.onIndex,
    required this.fallbackIcon,
    required this.saved,
    required this.onToggleSave,
    required this.onShare,
    this.hasTour = false,
    this.onTapTour,
  });

  final List<String> photos;
  final String heroTag;
  final int index;
  final ValueChanged<int> onIndex;
  final IconData fallbackIcon;
  final bool saved;
  final VoidCallback onToggleSave;
  final VoidCallback onShare;
  final bool hasTour;
  final VoidCallback? onTapTour;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: (MediaQuery.sizeOf(context).height * .35).clamp(240.0, 340.0),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (photos.isEmpty)
            AppImage(url: '', fallbackIcon: fallbackIcon, seed: 1)
          else
            PageView.builder(
              physics: Tokens.scroll,
              onPageChanged: onIndex,
              itemCount: photos.length,
              itemBuilder: (context, i) {
                final image = AppImage(
                  url: photos[i],
                  fallbackIcon: fallbackIcon,
                  seed: i + heroTag.length,
                );
                return i == 0 ? Hero(tag: heroTag, child: image) : image;
              },
            ),
          const IgnorePointer(child: PhotoScrim(top: 0.3, bottom: 0.25)),
          const Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 16,
              child: DecoratedBox(
                  decoration: BoxDecoration(
                      color: Tokens.canvas, borderRadius: BorderRadius.vertical(top: Radius.circular(20))))),
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
                      color: Colors.white,
                      onTap: () => Navigator.of(context).maybePop(),
                      child: const Icon(Icons.arrow_back_ios_new, size: 16, color: Tokens.primaryNavy),
                    ),
                    const Spacer(),
                    Semantics(
                      button: true,
                      label: saved ? 'Remove from saved' : 'Save property',
                      child: Glass.circle(
                        color: Colors.white,
                        onTap: onToggleSave,
                        child:
                            Icon(saved ? Icons.favorite : Icons.favorite_border, size: 18, color: Tokens.primaryNavy),
                      ),
                    ),
                    const SizedBox(width: Tokens.s8),
                    Glass.circle(
                      color: Colors.white,
                      onTap: onShare,
                      child: const Icon(Icons.share_outlined, size: 18, color: Tokens.primaryNavy),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (hasTour)
            Positioned(
              left: Tokens.s16,
              bottom: Tokens.s24,
              child: VirtualTourAction(
                title: '360°\u200b Tour',
                variant: VirtualTourActionVariant.dark,
                onTap: onTapTour,
              ),
            ),
          Positioned(
            right: Tokens.s16,
            bottom: Tokens.s24,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.55),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.photo_library_outlined, size: 13, color: Colors.white),
                  const SizedBox(width: 5),
                  Text(
                    photos.isEmpty ? 'No photos' : '${index + 1}/${photos.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 2),
                  const Icon(Icons.arrow_drop_down, size: 16, color: Tokens.primaryNavy),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AvailabilityRow extends StatelessWidget {
  const _AvailabilityRow({required this.card});

  final ListingCardView card;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final good = card.isAvailable;
    final color = good ? Tokens.available : Tokens.taken;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: Tokens.s16,
        vertical: Tokens.s12,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(Tokens.rSm),
      ),
      child: Row(
        children: [
          Icon(
            good ? Icons.event_available_outlined : Icons.event_busy_outlined,
            size: 18,
            color: color,
          ),
          const SizedBox(width: Tokens.s12),
          Expanded(
            child: Text(
              card.availabilityLabel,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OwnerCard extends StatelessWidget {
  const _OwnerCard({required this.name, required this.verified});

  final String name;
  final bool verified;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(Tokens.s16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(Tokens.rMd),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.business_outlined,
              size: 20,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(width: Tokens.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: theme.textTheme.titleMedium),
                if (verified) ...[
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(
                        Icons.verified,
                        size: 14,
                        color: Tokens.available,
                      ),
                      const SizedBox(width: Tokens.s4),
                      Expanded(
                        child: Text(
                          'Verified by the platform',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Tokens.available,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RentalTabsHeader extends SliverPersistentHeaderDelegate {
  _RentalTabsHeader({required this.tabs, required this.selected, required this.onSelect});

  final List<RentalTab> tabs;
  final RentalTab selected;
  final ValueChanged<RentalTab> onSelect;

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
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () {
                      HapticFeedback.selectionClick();
                      onSelect(tab);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: tab == selected ? Tokens.primaryNavy : Colors.transparent,
                            width: 2.5,
                          ),
                        ),
                      ),
                      child: Text(
                        tab.label,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: tab == selected ? FontWeight.w700 : FontWeight.w500,
                          color: tab == selected ? Tokens.primaryNavy : Tokens.muted,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const Divider(height: 1, thickness: 1, color: Tokens.hairline),
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _RentalTabsHeader oldDelegate) =>
      oldDelegate.selected != selected || oldDelegate.tabs != tabs;
}

class _TabEmpty extends StatelessWidget {
  const _TabEmpty({required this.icon, required this.title, required this.message});

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: Tokens.gutter),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: Tokens.muted),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Tokens.primaryNavy)),
            const SizedBox(height: 6),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: Tokens.muted)),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: Tokens.section),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: theme.textTheme.headlineSmall),
          const SizedBox(height: Tokens.s16),
          child,
        ],
      ),
    );
  }
}

class _SectionGap extends StatelessWidget {
  const _SectionGap();

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: Tokens.s32),
        child: Divider(color: Theme.of(context).colorScheme.outlineVariant),
      );
}

class _Bullet extends StatelessWidget {
  const _Bullet(this.text, {required this.icon});

  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: Tokens.s12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Icon(
              icon,
              size: 16,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(width: Tokens.s12),
          Expanded(child: Text(text, style: theme.textTheme.bodyLarge)),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Text(label, style: theme.textTheme.bodyMedium),
    );
  }
}

class _NotFound extends StatelessWidget {
  const _NotFound();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(Tokens.s32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'This listing is gone',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: Tokens.s8),
              Text(
                'It may have been let to someone else while you were looking.',
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

class _DetailLoading extends StatelessWidget {
  const _DetailLoading();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 380,
            color: theme.colorScheme.surfaceContainerHighest,
          ),
          Padding(
            padding: const EdgeInsets.all(Tokens.gutter),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 22,
                  width: 260,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: Tokens.s12),
                Container(
                  height: 14,
                  width: 180,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailFailed extends StatelessWidget {
  const _DetailFailed({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final message =
        error is ApiException ? (error as ApiException).message : 'Something went wrong loading this place.';

    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(Tokens.s32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.cloud_off_outlined,
                size: 40,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: Tokens.s16),
              Text(
                'Could not load this place',
                style: theme.textTheme.headlineSmall,
              ),
              const SizedBox(height: Tokens.s8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: Tokens.s20),
              SizedBox(
                width: 200,
                child: FilledButton(
                  onPressed: onRetry,
                  child: const Text('Try again'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
