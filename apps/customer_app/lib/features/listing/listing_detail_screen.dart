import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../design/app_image.dart';
import '../../design/glass.dart';
import '../../design/money.dart';
import '../../data/api_client.dart';
import '../../data/listing_repository.dart';
import '../../design/motion.dart';
import '../../design/tokens.dart';
import '../../fixtures/view_models.dart';
import '../saved/saved_controller.dart';
import 'widgets/move_in_cost_card.dart';

/// Listing detail.
///
/// The order follows the customer journey exactly: photos, then the **tour**,
/// then what it costs to actually move in, then everything else. The tour sits
/// above the fold because it is a discovery step, not an enhancement — and the
/// move-in cost sits directly under the price because comparing bare monthly
/// rent is misleading in a market where entry is three months up front.
class ListingDetailScreen extends ConsumerStatefulWidget {
  const ListingDetailScreen({required this.listingId, super.key});

  final String listingId;

  @override
  ConsumerState<ListingDetailScreen> createState() =>
      _ListingDetailScreenState();
}

class _ListingDetailScreenState extends ConsumerState<ListingDetailScreen> {
  final _scroll = ScrollController();
  final _photoPage = PageController();
  int _photoIndex = 0;

  @override
  void dispose() {
    _scroll.dispose();
    _photoPage.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(listingDetailProvider(widget.listingId));

    return switch (async) {
      // "Listing taken while browsing" is a state the journey names as normal
      // life, not an error — say so honestly rather than 404 silently.
      AsyncData(value: null) => const _NotFound(),
      AsyncError(:final error) => _DetailFailed(
          error: error,
          onRetry: () =>
              ref.invalidate(listingDetailProvider(widget.listingId)),
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

    return Scaffold(
      body: Stack(
        children: [
          CustomScrollView(
            controller: _scroll,
            physics: Tokens.scroll,
            slivers: [
              SliverToBoxAdapter(
                child: _Gallery(
                  photos: card.photos,
                  heroTag: 'photo-${card.id}',
                  controller: _photoPage,
                  index: _photoIndex,
                  onIndex: (i) => setState(() => _photoIndex = i),
                  fallbackIcon: Icons.apartment_outlined,
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(
                  Tokens.gutter,
                  Tokens.s32,
                  Tokens.gutter,
                  // Clears the commit bar with room to spare — a price pinned
                  // to the last line of text reads as an advert.
                  160,
                ),
                sliver: SliverList.list(
                  children: [
                    // The name of the place is the largest thing on the
                    // screen. Everything after it is a qualification of it.
                    Reveal(
                      child: Text(
                        card.title,
                        style: theme.textTheme.displaySmall,
                      ),
                    ),
                    const SizedBox(height: Tokens.s12),
                    Reveal(
                      order: 1,
                      child: Text(
                        '${card.resourceType.label} · ${card.propertyName}\n'
                        '${card.location}',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    const SizedBox(height: Tokens.s24),
                    Reveal(order: 2, child: _AvailabilityRow(card: card)),

                    if (card.hasTour) ...[
                      const SizedBox(height: Tokens.sectionTight),
                      _TourCallout(
                        sceneCount: card.sceneCount,
                        firstScenes: detail.scenes
                            .take(3)
                            .map((s) => s.label)
                            .toList(),
                        onTap: () => context.push(Routes.tour(card.id)),
                      ),
                    ],

                    if (card.moveInCost != null) ...[
                      const SizedBox(height: Tokens.sectionTight),
                      MoveInCostCard(
                        cost: card.moveInCost!,
                        monthlyCentavos: card.priceCentavos,
                      ),
                    ],

                    const _SectionGap(),
                    _Section(
                      title: 'About this place',
                      child: Text(
                        detail.description,
                        style: theme.textTheme.bodyLarge,
                      ),
                    ),

                    if (detail.sharedFacilities.isNotEmpty)
                      _Section(
                        title: 'What you share',
                        caption:
                            'For a bed space this is the whole question, so it '
                            'is spelled out.',
                        child: Column(
                          children: [
                            for (final item in detail.sharedFacilities)
                              _Bullet(item, icon: Icons.group_outlined),
                          ],
                        ),
                      ),

                    _Section(
                      title: 'What is included',
                      child: Wrap(
                        spacing: Tokens.s8,
                        runSpacing: Tokens.s8,
                        children: [
                          for (final amenity in detail.amenities)
                            _Tag(amenity),
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
                          for (final term in detail.terms)
                            _Bullet(term, icon: Icons.check),
                        ],
                      ),
                    ),

                    _Section(
                      title: 'House rules',
                      child: Column(
                        children: [
                          for (final rule in detail.houseRules)
                            _Bullet(rule, icon: Icons.remove),
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

                    _EnquireRow(isLongTerm: isLongTerm),
                  ],
                ),
              ),
            ],
          ),

          // Floating glass chrome, over the photograph rather than on a bar.
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: Tokens.s16,
                  vertical: Tokens.s8,
                ),
                child: Row(
                  children: [
                    Glass.circle(
                      size: 38,
                      onTap: () => Navigator.of(context).maybePop(),
                      child: const Icon(
                        Icons.arrow_back_ios_new,
                        size: 16,
                        color: Colors.white,
                      ),
                    ),
                    const Spacer(),
                    Glass.circle(
                      size: 38,
                      onTap: () =>
                          ref.read(savedIdsProvider.notifier).toggle(card.id),
                      child: Icon(
                        saved ? Icons.favorite : Icons.favorite_border,
                        size: 18,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _CommitBar(card: card),
          ),
        ],
      ),
    );
  }
}

class _Gallery extends StatelessWidget {
  const _Gallery({
    required this.photos,
    required this.heroTag,
    required this.controller,
    required this.index,
    required this.onIndex,
    required this.fallbackIcon,
  });

  final List<String> photos;
  final String heroTag;
  final PageController controller;
  final int index;
  final ValueChanged<int> onIndex;
  final IconData fallbackIcon;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 380,
      child: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: controller,
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
          const IgnorePointer(child: PhotoScrim(top: 0.34, bottom: 0.16)),
          if (photos.length > 1)
            Positioned(
              bottom: Tokens.s16,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < photos.length; i++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: i == index ? 18 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(i == index ? 1 : 0.5),
                        borderRadius: BorderRadius.circular(3),
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
        color: color.withOpacity(0.08),
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

class _TourCallout extends StatelessWidget {
  const _TourCallout({
    required this.sceneCount,
    required this.firstScenes,
    required this.onTap,
  });

  final int sceneCount;
  final List<String> firstScenes;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.all(Tokens.s16),
        decoration: BoxDecoration(
          color: theme.colorScheme.primary,
          borderRadius: BorderRadius.circular(Tokens.rMd),
        ),
        child: Row(
          children: [
            Icon(
              Icons.threed_rotation,
              size: 30,
              color: theme.colorScheme.onPrimary,
            ),
            const SizedBox(width: Tokens.s16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Walk through it',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.onPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    // Scene labels arrive with the tour endpoint in Sprint 6.
                    // Until then the room count is real (it comes from the API)
                    // and the preview is simply omitted rather than rendered as
                    // a dangling ellipsis.
                    firstScenes.isEmpty
                        ? '$sceneCount rooms to walk through'
                        : '$sceneCount rooms · ${firstScenes.join(", ")}…',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onPrimary.withOpacity(0.7),
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward,
              size: 18,
              color: theme.colorScheme.onPrimary,
            ),
          ],
        ),
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
              color: theme.colorScheme.primary.withOpacity(0.08),
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
                      // Verification is a real gate: an unverified organization
                      // cannot publish at all. Worth saying out loud.
                      Text(
                        'Verified by the platform',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Tokens.available,
                          fontWeight: FontWeight.w600,
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

/// Optional, and the journey says so: some customers want a physical viewing
/// even after the tour, and some questions the listing does not answer.
class _EnquireRow extends StatelessWidget {
  const _EnquireRow({required this.isLongTerm});

  final bool isLongTerm;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const _SectionGap(),
        Row(
          children: [
            Expanded(
              child: _GhostButton(
                icon: Icons.chat_bubble_outline,
                label: 'Ask a question',
                onTap: () => _notYet(context, 'Enquiries'),
              ),
            ),
            const SizedBox(width: Tokens.s12),
            Expanded(
              child: _GhostButton(
                icon: Icons.calendar_today_outlined,
                label: 'Request a viewing',
                onTap: () => _notYet(context, 'Viewing requests'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  static void _notYet(BuildContext context, String what) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$what need the API contracts from Step 5.')),
    );
  }
}

class _GhostButton extends StatelessWidget {
  const _GhostButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(Tokens.rMd),
          border: Border.all(color: theme.colorScheme.outlineVariant),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 17),
            const SizedBox(width: Tokens.s8),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelMedium,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The sticky commitment bar. Price on the left so it stays visible while the
/// customer reads, action on the right.
class _CommitBar extends StatelessWidget {
  const _CommitBar({required this.card});

  final ListingCardView card;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLongTerm = card.kind == ListingKind.longTerm;

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(color: theme.colorScheme.outlineVariant),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            Tokens.gutter,
            Tokens.s12,
            Tokens.gutter,
            Tokens.s12,
          ),
          child: Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    isLongTerm
                        ? Money.perMonth(card.priceCentavos)
                        : Money.perNight(card.priceCentavos),
                    style: theme.textTheme.headlineSmall,
                  ),
                  if (card.moveInCost != null)
                    Text(
                      '${Money.peso(card.moveInCost!.totalCentavos)} to move in',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Tokens.accent,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
              const SizedBox(width: Tokens.s16),
              Expanded(
                child: FilledButton(
                  onPressed: card.isAvailable
                      ? () {
                          HapticFeedback.mediumImpact();
                          context.push(
                            isLongTerm
                                ? Routes.apply(card.id)
                                : Routes.book(card.id),
                          );
                        }
                      : null,
                  child: Text(
                    card.isAvailable
                        ? (isLongTerm ? 'Apply to rent' : 'Check dates')
                        : 'Not available',
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

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child, this.caption});

  final String title;
  final String? caption;
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
          if (caption != null) ...[
            const SizedBox(height: Tokens.s6),
            Text(caption!, style: theme.textTheme.bodySmall),
          ],
          // A heading needs room to be a heading. At 12 it looked like a label
          // stuck to the paragraph below it.
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

/// Waiting for the listing.
class _DetailLoading extends StatelessWidget {
  const _DetailLoading();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(height: 380, color: theme.colorScheme.surfaceContainerHighest),
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

/// The listing could not be loaded — distinct from it being gone.
class _DetailFailed extends StatelessWidget {
  const _DetailFailed({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final message = error is ApiException
        ? (error as ApiException).message
        : 'Something went wrong loading this place.';

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
              Text('Could not load this place',
                  style: theme.textTheme.headlineSmall),
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
