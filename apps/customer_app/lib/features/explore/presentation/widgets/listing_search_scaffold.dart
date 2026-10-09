import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/router.dart';
import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../location/location_controller.dart';
import '../../application/explore_controller.dart';
import '../../application/explore_results.dart';
import '../../application/search_suggestions.dart';
import '../../domain/explore_query.dart';
import '../../domain/listing_category.dart';
import 'listing_results_sliver.dart';
import 'listing_search_header.dart';
import 'price_sheet.dart';
import 'results_count_bar.dart';
import 'search_suggestions_panel.dart';
import 'search_summary_chip.dart';
import 'sort_sheet.dart';

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
  final _scroll = ScrollController();
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
    _scroll.addListener(_maybeLoadMore);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(locationProvider.notifier).refreshIfStale();
      if (widget.focusSearch) _searchFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    _scroll
      ..removeListener(_maybeLoadMore)
      ..dispose();
    _search.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  void _maybeLoadMore() {
    if (!mounted || !_scroll.hasClients) return;
    final position = _scroll.position;
    if (position.pixels >= position.maxScrollExtent - Tokens.paginationPrefetchExtent) {
      ref.read(exploreResultsProvider(widget.seed).notifier).loadMore();
    }
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

  void _handleBack() {
    if (_searching) {
      _searchFocus.unfocus();
      return;
    }
    if (context.canPop()) {
      context.pop();
    } else {
      Navigator.of(context).maybePop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(exploreQueryProvider(widget.seed));
    return Scaffold(
      backgroundColor: Tokens.canvas,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: Tokens.primaryNavy,
          onRefresh: () => ref.read(exploreResultsProvider(widget.seed).notifier).refresh(),
          child: CustomScrollView(
            controller: _scroll,
            physics: Tokens.scroll,
            slivers: [
              SliverToBoxAdapter(
                child: ListingPageTitle(title: widget.titleFor(query)),
              ),
              SliverPersistentHeader(
                pinned: true,
                delegate: ListingSearchHeaderDelegate(
                  onBack: _handleBack,
                  search: AppSearchField(
                    hint: widget.searchHint,
                    controller: _search,
                    focusNode: _searchFocus,
                    onChanged: (_) => setState(() {}),
                    onSubmitted: _submit,
                    onClear: _clearSearch,
                  ),
                  controls: ListingQuickControls(
                    controls: [
                      ListingQuickControl(
                        id: 'filter',
                        label: 'Filter',
                        leading: const Icon(Icons.tune_rounded),
                        active: query.filterCount > 0,
                        onTap: () => widget.onOpenFilters(context),
                      ),
                      ListingQuickControl(
                        id: 'price',
                        label: 'Price',
                        leading: query.isBuy ? const Icon(Icons.sell_outlined) : const PesoGlyph(),
                        active: query.maxPriceCentavos != null,
                        onTap: () => showPriceSheet(context, widget.seed),
                      ),
                      ListingQuickControl(
                        id: 'sort',
                        label: query.sort == ExploreSort.recommended ? 'Sort' : query.sort.label,
                        leading: const Icon(Icons.swap_vert_rounded),
                        active: query.sort != ExploreSort.recommended,
                        onTap: () => showSortSheet(context, widget.seed),
                      ),
                    ],
                  ),
                ),
              ),
              if (_searching)
                SliverFillRemaining(
                  hasScrollBody: true,
                  child: SingleChildScrollView(
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
                  ),
                )
              else ...[
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
                    showSort: false,
                  ),
                ),
                if (widget.notice != null)
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s12),
                    sliver: SliverToBoxAdapter(child: widget.notice),
                  ),
                ListingResultsSliver(seed: widget.seed, pluralNoun: widget.pluralNoun),
              ],
            ],
          ),
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
