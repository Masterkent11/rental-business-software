import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../design/tokens.dart';
import '../../../design/typography.dart';
import '../../editorial/application/editorial_content.dart';
import '../../editorial/domain/editorial_card.dart';
import '../../editorial/presentation/editorial_carousel.dart';
import '../../editorial/presentation/editorial_routes.dart';
import '../../location/location_sheet.dart';
import '../application/stay_search_controller.dart';
import '../domain/explore_query.dart';
import '../domain/listing_category.dart';
import 'widgets/faq_section.dart';
import 'widgets/stay_header.dart';
import 'widgets/stay_search_card.dart';
import 'widgets/why_book_section.dart';

class StaySearchScreen extends ConsumerWidget {
  const StaySearchScreen({required this.category, this.initialMode, super.key});

  final ListingCategory? category;
  final RentMode? initialMode;

  static String titleFor(ListingCategory? category) => category == null ? 'Find a stay' : '${category.label} stays';

  StaySearchArgs get _args => (category: category, mode: initialMode);

  void _onEditorialAction(BuildContext context, WidgetRef ref, EditorialAction action) {
    final controller = ref.read(staySearchProvider(_args).notifier);
    switch (action) {
      case EditorialAction.shortStays:
        controller.setMode(RentMode.shortStay);
      case EditorialAction.monthlyStays:
        controller.setMode(RentMode.monthly);
      default:
        context.push(editorialRoute(action, category: category));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final slot = (placement: EditorialPlacement.staySearch, category: category);
    return Scaffold(
      backgroundColor: Tokens.canvas,
      body: CustomScrollView(
        physics: Tokens.scroll,
        slivers: [
          SliverSafeArea(
            bottom: false,
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const StayHeader(),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s4, Tokens.gutter, Tokens.s16),
                    child: Text(titleFor(category), style: AppText.hero),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
                    child: StaySearchCard(
                      args: _args,
                      onSearch: (query) => context.push(Routes.stayResults(query)),
                      onChooseLocation: () => showLocationSheet(context),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.only(top: Tokens.s24),
            sliver: SliverToBoxAdapter(
              child: EditorialCarousel(
                cards: ref.watch(editorialCardsProvider(slot)),
                aspectRatio: Tokens.editorialAspectRatio,
                titleStyle: AppText.editorialTitle,
                onAction: (action) => _onEditorialAction(context, ref, action),
              ),
            ),
          ),
          const FaqSection(),
          const WhyBookSection(),
          const SliverToBoxAdapter(child: SizedBox(height: Tokens.s40)),
        ],
      ),
    );
  }
}
