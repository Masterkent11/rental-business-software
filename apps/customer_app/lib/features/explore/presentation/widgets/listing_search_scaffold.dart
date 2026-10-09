import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/router.dart';
import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../../location/location_controller.dart';
import '../../application/explore_controller.dart';
import '../../application/search_suggestions.dart';
import '../../domain/explore_query.dart';
import '../../domain/listing_category.dart';
import 'listing_results_scroll_view.dart';
import 'results_count_bar.dart';
import 'search_summary_chip.dart';
import 'search_suggestions_panel.dart';

class ListingSearchScaffold extends ConsumerStatefulWidget {
  const ListingSearchScaffold({
    required this.seed,
    required this.titleFor,
    required this.searchHint,
    required this.singularNoun,
    required this.pluralNoun,
    required this.onOpenFilters,
    this.summary,
    this.notice,
    this.focusSearch = false,
    super.key,
  });

  final ExploreQuery seed;
  final String Function(ExploreQuery query) titleFor;
  final String searchHint;
  final String singularNoun;
  final String pluralNoun;
  final void Function(BuildContext context) onOpenFilters;
  final Widget? summary;
  final Widget? notice;
  final bool focusSearch;

  @override
  ConsumerState<ListingSearchScaffold> createState() => _ListingSearchScaffoldState();
}

class _ListingSearchScaffoldState extends ConsumerState<ListingSearchScaffold> {
  final _searchFocus = FocusNode();
  late final TextEditingController _search;
  bool _searching = false;

  ExploreController get _controller => ref.read(exploreQueryProvider(widget.seed).notifier);

  @override
  void initState() {
    super.initState();
    _search = TextEditingController(text: widget.seed.text);
    _searchFocus.addListener(() {
      if (mounted) setState(() => _searching = _searchFocus.hasFocus);
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(locationProvider.notifier).refreshIfStale();
      if (widget.focusSearch) _searchFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    _search.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  void _submit(String value) {
    final text = value.trim();
    _controller.setText(text);
    if (text.isNotEmpty) ref.read(recentSearchesProvider.notifier).add(text);
    _searchFocus.unfocus();
  }

  void _clearSearch() {
    _search.clear();
    _controller.setText('');
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(exploreQueryProvider(widget.seed));
    return Scaffold(
      backgroundColor: Tokens.canvas,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(Tokens.s4, Tokens.s4, Tokens.gutter, 0),
              child: Row(
                children: [
                  if (context.canPop())
                    AppIconButton(icon: Icons.arrow_back_rounded, semanticLabel: 'Back', onPressed: () => context.pop())
                  else
                    const SizedBox(width: Tokens.s12),
                  Expanded(
                    child: Text(
                      widget.titleFor(query),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppText.sectionTitle,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, 0),
              child: Row(
                children: [
                  Expanded(
                    child: AppSearchField(
                      hint: widget.searchHint,
                      controller: _search,
                      focusNode: _searchFocus,
                      onChanged: (_) => setState(() {}),
                      onSubmitted: _submit,
                      onClear: _clearSearch,
                    ),
                  ),
                  const SizedBox(width: Tokens.s8),
                  AppFilterButton(activeCount: query.filterCount, onPressed: () => widget.onOpenFilters(context)),
                ],
              ),
            ),
            Expanded(
              child: _searching
                  ? SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s12, Tokens.gutter, Tokens.s24),
                      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                      child: SearchSuggestionsPanel(
                        text: _search.text,
                        intent: query.intent,
                        onRecent: (value) {
                          _search.text = value;
                          _submit(value);
                        },
                        onLocation: (suggestion) {
                          ref.read(locationProvider.notifier).chooseCity(suggestion.cityLabel);
                          _controller.setArea(suggestion.areaLabel);
                          _clearSearch();
                          _searchFocus.unfocus();
                        },
                        onListing: (suggestion) {
                          _searchFocus.unfocus();
                          context.push(Routes.listing(suggestion.id));
                        },
                        onCategory: (category) {
                          _clearSearch();
                          _searchFocus.unfocus();
                          _controller.setCategory(category);
                        },
                      ),
                    )
                  : ListingResultsScrollView(
                      seed: widget.seed,
                      pluralNoun: widget.pluralNoun,
                      leading: [
                        SliverToBoxAdapter(
                          child: _CategoryChips(
                            intent: query.intent,
                            selected: query.category,
                            onSelected: _controller.setCategory,
                          ),
                        ),
                        if (widget.summary != null)
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s4),
                            sliver: SliverToBoxAdapter(child: widget.summary),
                          ),
                        if (query.area != null)
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s4),
                            sliver: SliverToBoxAdapter(
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: SearchSummaryChip(
                                  icon: Icons.location_on_outlined,
                                  label: query.area!,
                                  onClear: () => _controller.setArea(null),
                                ),
                              ),
                            ),
                          ),
                        SliverToBoxAdapter(
                          child: ResultsCountBar(
                            seed: widget.seed,
                            singularNoun: widget.singularNoun,
                            pluralNoun: widget.pluralNoun,
                          ),
                        ),
                        if (widget.notice != null)
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s12),
                            sliver: SliverToBoxAdapter(child: widget.notice),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({required this.intent, required this.selected, required this.onSelected});

  final MarketIntent intent;
  final ListingCategory? selected;
  final ValueChanged<ListingCategory?> onSelected;

  @override
  Widget build(BuildContext context) {
    final categories = ListingCategory.forIntent(intent);
    return SizedBox(
      height: Tokens.tap + Tokens.s12,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: Tokens.scroll,
        padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s4, Tokens.gutter, Tokens.s8),
        itemCount: categories.length + 1,
        separatorBuilder: (_, __) => const SizedBox(width: Tokens.s8),
        itemBuilder: (context, index) {
          if (index == 0) {
            return AppFilterChip(label: 'All', selected: selected == null, onTap: () => onSelected(null));
          }
          final category = categories[index - 1];
          return AppFilterChip(
            label: category.labelFor(intent),
            selected: category == selected,
            onTap: () => onSelected(category == selected ? null : category),
          );
        },
      ),
    );
  }
}
