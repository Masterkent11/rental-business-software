import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../data/marketplace_repository.dart';
import '../../../design/app_image.dart';
import '../../../design/glass.dart';
import '../../../design/osm_map.dart';
import '../../../design/tokens.dart';
import '../../../fixtures/view_models.dart';
import '../../auth/auth_guard.dart';

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

  void _message() => _guarded(
        Routes.startConversation(listingId: _card.id),
        'Sign in to message the agent or owner.',
      );

  void _inquire() => _guarded(Routes.inquire(_card.id), 'Sign in to send an inquiry.');

  void _scheduleViewing() => _guarded(Routes.viewing(_card.id), 'Sign in to schedule a viewing.');

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final card = _card;
    final openInquiry = ref.watch(openInquiryProvider(card.id)).valueOrNull;
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
              padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s20, Tokens.gutter, Tokens.s8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: Tokens.s8,
                    runSpacing: Tokens.s6,
                    children: [
                      const _Pill(label: 'For sale', dark: true),
                      _Pill(label: card.typeLabel),
                      _Pill(label: card.saleStatusLabel),
                      if (card.hasTour) const _Pill(label: '360° tour', icon: Icons.threed_rotation),
                    ],
                  ),
                  const SizedBox(height: Tokens.s12),
                  Text(card.title, style: theme.textTheme.headlineMedium?.copyWith(color: Tokens.primaryNavy)),
                  const SizedBox(height: Tokens.s6),
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
                SaleTab.overview => _Overview(
                    detail: widget.detail,
                    openInquiry: openInquiry,
                    onScheduleViewing: _scheduleViewing,
                    onOpenInquiry: openInquiry == null ? null : () => context.push(Routes.conversation(openInquiry.conversationId)),
                  ),
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
        inquired: openInquiry != null,
        onMessage: _message,
        onInquire: openInquiry == null ? _inquire : () => context.push(Routes.conversation(openInquiry.conversationId)),
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
      height: 320,
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
          const IgnorePointer(child: PhotoScrim(top: 0.3, bottom: 0.2)),
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
                  ],
                ),
              ),
            ),
          ),
          if (photos.length > 1)
            Positioned(
              right: Tokens.s16,
              bottom: Tokens.s16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(999)),
                child: Text('${index + 1}/${photos.length}', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
              ),
            ),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, this.dark = false, this.icon});

  final String label;
  final bool dark;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: dark ? Tokens.primaryNavy : Tokens.softBlue,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: dark ? Colors.white : Tokens.primaryNavy),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: dark ? Colors.white : Tokens.primaryNavy),
          ),
        ],
      ),
    );
  }
}

class _PriceOnInquiry extends StatelessWidget {
  const _PriceOnInquiry();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(Tokens.s16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Tokens.rMd),
        border: Border.all(color: Tokens.hairline),
      ),
      child: const Row(
        children: [
          Icon(Icons.lock_outline, size: 20, color: Tokens.primaryNavy),
          SizedBox(width: Tokens.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(kPriceOnInquiry, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Tokens.primaryNavy)),
                SizedBox(height: 2),
                Text(
                  'The agent or owner shares pricing and payment terms privately when you inquire.',
                  style: TextStyle(fontSize: 12.5, color: Tokens.muted),
                ),
              ],
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
                              decoration: BoxDecoration(color: Tokens.primaryNavy, borderRadius: BorderRadius.circular(2)),
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

class _Overview extends StatelessWidget {
  const _Overview({
    required this.detail,
    required this.openInquiry,
    required this.onScheduleViewing,
    required this.onOpenInquiry,
  });

  final ListingDetailView detail;
  final InquiryView? openInquiry;
  final VoidCallback onScheduleViewing;
  final VoidCallback? onOpenInquiry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final card = detail.card;
    final facts = <(IconData, String, String)>[
      if (card.beds > 0) (Icons.bed_outlined, '${card.beds}', card.beds == 1 ? 'Bedroom' : 'Bedrooms'),
      if (card.baths > 0) (Icons.bathtub_outlined, '${card.baths}', card.baths == 1 ? 'Bathroom' : 'Bathrooms'),
      if (card.sqm != null) (Icons.square_foot, '${card.sqm} m²', 'Floor area'),
      if (card.lotAreaSqm != null) (Icons.crop_square, '${card.lotAreaSqm} m²', 'Lot area'),
      if (card.parkingSlots > 0) (Icons.directions_car_outlined, '${card.parkingSlots}', card.parkingSlots == 1 ? 'Parking' : 'Parking slots'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (facts.isNotEmpty)
          Wrap(
            spacing: Tokens.s8,
            runSpacing: Tokens.s8,
            children: [
              for (final (icon, value, label) in facts)
                Container(
                  width: 104,
                  padding: const EdgeInsets.all(Tokens.s12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(Tokens.rSm),
                    border: Border.all(color: Tokens.hairline),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(icon, size: 18, color: Tokens.primaryNavy),
                      const SizedBox(height: 6),
                      Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Tokens.primaryNavy)),
                      Text(label, style: const TextStyle(fontSize: 11.5, color: Tokens.muted)),
                    ],
                  ),
                ),
            ],
          ),
        if (card.hasTour) ...[
          const SizedBox(height: Tokens.s16),
          Material(
            color: Tokens.primaryNavy,
            borderRadius: BorderRadius.circular(Tokens.rMd),
            child: InkWell(
              borderRadius: BorderRadius.circular(Tokens.rMd),
              onTap: () => context.push(Routes.tour(card.id)),
              child: Padding(
                padding: const EdgeInsets.all(Tokens.s16),
                child: Row(
                  children: [
                    const Icon(
                      Icons.threed_rotation,
                      color: Colors.white,
                      size: 26,
                    ),
                    const SizedBox(width: Tokens.s16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Walk through it',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            card.sceneCount > 0
                                ? '${card.sceneCount} room${card.sceneCount == 1 ? '' : 's'} to walk through'
                                : 'Explore with 360° virtual tour',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.75),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.arrow_forward_ios,
                      color: Colors.white70,
                      size: 16,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
        const SizedBox(height: Tokens.s20),
        if (openInquiry != null)
          _InquiryNotice(inquiry: openInquiry!, onOpen: onOpenInquiry)
        else
          const SizedBox.shrink(),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: onScheduleViewing,
            icon: const Icon(Icons.event_available_outlined, size: 18),
            label: const Text('Schedule a viewing'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Tokens.primaryNavy,
              minimumSize: const Size.fromHeight(48),
              side: const BorderSide(color: Tokens.primaryNavy),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Tokens.rSm)),
            ),
          ),
        ),
        const SizedBox(height: Tokens.s24),
        Text('About this property', style: theme.textTheme.titleLarge),
        const SizedBox(height: Tokens.s8),
        Text(detail.description.isEmpty ? 'No description yet.' : detail.description, style: theme.textTheme.bodyLarge),
        if (detail.amenities.isNotEmpty) ...[
          const SizedBox(height: Tokens.s24),
          Text('Features', style: theme.textTheme.titleLarge),
          const SizedBox(height: Tokens.s12),
          Wrap(
            spacing: Tokens.s8,
            runSpacing: Tokens.s8,
            children: [
              for (final feature in detail.amenities)
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
        const SizedBox(height: Tokens.s24),
        Text(card.representative == null ? 'Listed by' : 'Your agent', style: theme.textTheme.titleLarge),
        const SizedBox(height: Tokens.s12),
        _PartnerCard(card: card, ownerName: detail.ownerName, ownerVerified: detail.ownerVerified),
      ],
    );
  }
}

class _InquiryNotice extends StatelessWidget {
  const _InquiryNotice({required this.inquiry, required this.onOpen});

  final InquiryView inquiry;
  final VoidCallback? onOpen;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Tokens.s12),
      child: Material(
        color: Tokens.softBlue,
        borderRadius: BorderRadius.circular(Tokens.rSm),
        child: InkWell(
          borderRadius: BorderRadius.circular(Tokens.rSm),
          onTap: onOpen,
          child: Padding(
            padding: const EdgeInsets.all(Tokens.s12),
            child: Row(
              children: [
                const Icon(Icons.mark_email_read_outlined, color: Tokens.primaryNavy, size: 20),
                const SizedBox(width: Tokens.s12),
                Expanded(
                  child: Text(
                    'You inquired about this property · ${inquiry.progressLabel}',
                    style: const TextStyle(fontWeight: FontWeight.w600, color: Tokens.primaryNavy),
                  ),
                ),
                const Icon(Icons.chevron_right, color: Tokens.primaryNavy),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PartnerCard extends StatelessWidget {
  const _PartnerCard({required this.card, required this.ownerName, required this.ownerVerified});

  final ListingCardView card;
  final String ownerName;
  final bool ownerVerified;

  @override
  Widget build(BuildContext context) {
    final agent = card.representative;
    final name = agent?.displayName ?? (ownerName.isEmpty ? 'Property owner' : ownerName);
    final subtitle = agent == null ? 'Owner' : (agent.headline.isEmpty ? 'Real estate agent' : agent.headline);
    final verified = agent?.verified ?? ownerVerified;
    final initials = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).take(2).map((w) => w[0].toUpperCase()).join();
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(Tokens.rMd),
      child: InkWell(
        borderRadius: BorderRadius.circular(Tokens.rMd),
        onTap: agent == null ? null : () => context.push(Routes.agent(agent.agentId)),
        child: Container(
          padding: const EdgeInsets.all(Tokens.s16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(Tokens.rMd),
            border: Border.all(color: Tokens.hairline),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: Tokens.softBlue,
                foregroundImage: agent?.photoUrl == null ? null : NetworkImage(agent!.photoUrl!),
                child: Text(initials, style: const TextStyle(fontWeight: FontWeight.w700, color: Tokens.primaryNavy)),
              ),
              const SizedBox(width: Tokens.s12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5, color: Tokens.primaryNavy)),
                        ),
                        if (verified) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified, size: 16, color: Tokens.primaryBlue, semanticLabel: 'Verified'),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, color: Tokens.muted)),
                  ],
                ),
              ),
              if (agent != null) const Icon(Icons.chevron_right, color: Tokens.muted),
            ],
          ),
        ),
      ),
    );
  }
}

class _PhotosTab extends StatelessWidget {
  const _PhotosTab({required this.photos});

  final List<String> photos;

  @override
  Widget build(BuildContext context) {
    if (photos.isEmpty) {
      return const _TabEmpty(icon: Icons.photo_library_outlined, title: 'No photos yet', message: 'The agent or owner has not added photos.');
    }
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: photos.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 4 / 3),
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
          child: Center(child: AppImage(url: photos[i], fallbackIcon: Icons.photo_outlined, seed: i, fit: BoxFit.contain)),
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
      return const _TabEmpty(icon: Icons.threed_rotation, title: 'No virtual tour yet', message: 'Ask the agent for a viewing, or check back later.');
    }
    return GestureDetector(
      onTap: () => context.push(Routes.tour(card.id)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Tokens.rMd),
        child: AspectRatio(
          aspectRatio: 16 / 10,
          child: Stack(
            fit: StackFit.expand,
            children: [
              AppImage(url: card.photos.isEmpty ? '' : card.photos.first, fallbackIcon: Icons.threed_rotation, seed: 7),
              const ColoredBox(color: Color(0x66000000)),
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.threed_rotation, color: Colors.white, size: 44),
                    const SizedBox(height: Tokens.s8),
                    Text(
                      card.sceneCount > 0 ? 'Walk through ${card.sceneCount} room${card.sceneCount == 1 ? '' : 's'}' : 'Walk through it',
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    const Text('Drag to look around · tap doors to move', style: TextStyle(color: Colors.white70, fontSize: 12.5)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FloorPlanTab extends StatelessWidget {
  const _FloorPlanTab({required this.plans});

  final List<FloorPlanView> plans;

  @override
  Widget build(BuildContext context) {
    if (plans.isEmpty) {
      return const _TabEmpty(icon: Icons.grid_view_outlined, title: 'No floor plan yet', message: 'Ask the agent to share the floor plan in your inquiry.');
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
                  builder: (_) => _PhotoViewer(photos: [for (final p in plans) p.url], initial: i, title: 'Floor plans'),
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
                        child: AppImage(url: plans[i].url, fallbackIcon: Icons.grid_view_outlined, seed: i, fit: BoxFit.contain),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(Tokens.s12),
                      child: Row(
                        children: [
                          Expanded(child: Text(plans[i].label, style: const TextStyle(fontWeight: FontWeight.w700, color: Tokens.primaryNavy))),
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
      return const _TabEmpty(icon: Icons.map_outlined, title: 'Location not shared yet', message: 'The agent can share directions when you schedule a viewing.');
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
  const _ActionBar({required this.inquired, required this.onMessage, required this.onInquire});

  final bool inquired;
  final VoidCallback onMessage;
  final VoidCallback onInquire;

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
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onMessage,
                  icon: const Icon(Icons.chat_bubble_outline, size: 18),
                  label: const Text('Message'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Tokens.primaryNavy,
                    minimumSize: const Size.fromHeight(50),
                    side: const BorderSide(color: Tokens.hairline),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Tokens.rSm)),
                  ),
                ),
              ),
              const SizedBox(width: Tokens.s12),
              Expanded(
                child: FilledButton(
                  onPressed: onInquire,
                  style: FilledButton.styleFrom(
                    backgroundColor: Tokens.primaryNavy,
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Tokens.rSm)),
                  ),
                  child: Text(inquired ? 'View inquiry' : 'Inquire Now'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
