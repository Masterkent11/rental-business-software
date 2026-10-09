import 'package:flutter/material.dart';

import '../../../design/controls.dart';
import '../../../design/tokens.dart';
import '../../../design/typography.dart';
import '../../../fixtures/view_models.dart';
import '../domain/editorial_card.dart';

class EditorialCarousel extends StatefulWidget {
  const EditorialCarousel({
    required this.cards,
    required this.onAction,
    this.aspectRatio = Tokens.heroAspectRatio,
    this.titleStyle = AppText.heroCardTitle,
    this.agents = const [],
    this.footnote,
    super.key,
  });

  final List<EditorialCard> cards;
  final ValueChanged<EditorialAction> onAction;
  final double aspectRatio;
  final TextStyle titleStyle;
  final List<RepresentativeView> agents;
  final String? footnote;

  @override
  State<EditorialCarousel> createState() => _EditorialCarouselState();
}

class _EditorialCarouselState extends State<EditorialCarousel> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cards = widget.cards;
    if (cards.isEmpty) return const SizedBox.shrink();
    return Column(
      children: [
        AspectRatio(
          aspectRatio: widget.aspectRatio,
          child: PageView.builder(
            controller: _controller,
            itemCount: cards.length,
            onPageChanged: (page) => setState(() => _page = page),
            itemBuilder: (context, index) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
              child: _EditorialSlide(
                card: cards[index],
                titleStyle: widget.titleStyle,
                agents: cards[index].action == EditorialAction.homesForSale ? widget.agents : const [],
                footnote: index == 0 ? widget.footnote : null,
                onAction: () => widget.onAction(cards[index].action),
              ),
            ),
          ),
        ),
        if (cards.length > 1) ...[
          const SizedBox(height: Tokens.s8),
          _PageIndicator(count: cards.length, page: _page),
        ],
      ],
    );
  }
}

class _PageIndicator extends StatelessWidget {
  const _PageIndicator({required this.count, required this.page});

  final int count;
  final int page;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Slide ${page + 1} of $count',
      excludeSemantics: true,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (var i = 0; i < count; i++)
            AnimatedContainer(
              duration: Tokens.quick,
              margin: const EdgeInsets.symmetric(horizontal: Tokens.s2),
              width: i == page ? Tokens.pageIndicatorActive : Tokens.pageIndicatorDot,
              height: Tokens.pageIndicatorDot,
              decoration: BoxDecoration(
                color: i == page ? Tokens.primaryNavy : Tokens.hairline,
                borderRadius: BorderRadius.circular(Tokens.pageIndicatorDot / 2),
              ),
            ),
        ],
      ),
    );
  }
}

class _EditorialSlide extends StatelessWidget {
  const _EditorialSlide({
    required this.card,
    required this.titleStyle,
    required this.agents,
    required this.onAction,
    this.footnote,
  });

  final EditorialCard card;
  final TextStyle titleStyle;
  final List<RepresentativeView> agents;
  final VoidCallback onAction;
  final String? footnote;

  @override
  Widget build(BuildContext context) {
    final cacheWidth = (MediaQuery.sizeOf(context).width * MediaQuery.devicePixelRatioOf(context)).round();
    return ClipRRect(
      borderRadius: BorderRadius.circular(Tokens.rCard),
      child: Stack(
        fit: StackFit.expand,
        children: [
          const ColoredBox(color: Tokens.primaryNavy),
          Image.asset(
            card.image,
            fit: BoxFit.cover,
            cacheWidth: cacheWidth,
            gaplessPlayback: true,
            excludeFromSemantics: true,
            frameBuilder: (context, child, frame, synchronous) => synchronous
                ? child
                : AnimatedOpacity(opacity: frame == null ? 0 : 1, duration: Tokens.medium, child: child),
            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [Color(0xD917243D), Color(0x8017243D), Color(0x1417243D)],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(Tokens.s16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (card.eyebrow != null) ...[
                  Text(card.eyebrow!.toUpperCase(), style: AppText.eyebrow),
                  const SizedBox(height: Tokens.s4),
                ],
                Text(card.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: titleStyle),
                const SizedBox(height: Tokens.s4),
                Text(card.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: AppText.onPhotoSupporting),
                if (agents.isNotEmpty) ...[
                  const SizedBox(height: Tokens.s8),
                  _AgentAvatars(agents: agents),
                ],
                const Spacer(),
                Row(
                  children: [
                    AppCompactButton(
                      label: card.actionLabel,
                      icon: Icons.arrow_forward_rounded,
                      tone: AppCompactTone.onPhoto,
                      onPressed: onAction,
                    ),
                    const Spacer(),
                    if (footnote != null) ...[
                      const Icon(Icons.location_on_rounded, size: Tokens.iconSm, color: Colors.white70),
                      const SizedBox(width: Tokens.s4),
                      Flexible(
                        child: Text(
                          footnote!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppText.captionStrong.copyWith(color: Colors.white70),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AgentAvatars extends StatelessWidget {
  const _AgentAvatars({required this.agents});

  final List<RepresentativeView> agents;

  @override
  Widget build(BuildContext context) {
    final shown = agents.take(3).toList(growable: false);
    return Semantics(
      label: shown.map((agent) => agent.displayName).join(', '),
      excludeSemantics: true,
      child: SizedBox(
        height: Tokens.avatarSm + Tokens.s4,
        width: Tokens.avatarSm + Tokens.s4 + (shown.length - 1) * Tokens.avatarOverlap,
        child: Stack(
          children: [
            for (var i = 0; i < shown.length; i++)
              Positioned(
                left: i * Tokens.avatarOverlap,
                child: Container(
                  padding: const EdgeInsets.all(Tokens.s2),
                  decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                  child: CircleAvatar(
                    radius: Tokens.avatarSm / 2,
                    backgroundColor: Tokens.softBlue,
                    foregroundImage: shown[i].photoUrl == null ? null : NetworkImage(shown[i].photoUrl!),
                    child: Text(
                      shown[i].displayName.isEmpty ? '?' : shown[i].displayName[0].toUpperCase(),
                      style: AppText.captionStrong.copyWith(color: Tokens.primaryNavy),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
