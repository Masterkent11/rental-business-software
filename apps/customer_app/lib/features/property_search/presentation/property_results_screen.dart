import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../data/api_client.dart';
import '../../../design/components.dart';
import '../../../design/money.dart';
import '../../../design/tokens.dart';
import '../../discovery/widgets/listing_card.dart';
import '../application/property_search_controller.dart';
import '../application/property_search_repository.dart';
import '../domain/property_search_criteria.dart';
import '../domain/property_type.dart';

class PropertyResultsScreen extends ConsumerStatefulWidget {
  const PropertyResultsScreen({
    super.key,
    this.criteria,
  });

  final PropertySearchCriteria? criteria;

  @override
  ConsumerState<PropertyResultsScreen> createState() =>
      _PropertyResultsScreenState();
}

class _PropertyResultsScreenState extends ConsumerState<PropertyResultsScreen> {
  late final TextEditingController _searchController;
  late final PropertySearchCriteria _criteria;
  final _scroll = ScrollController();
  Timer? _debounce;
  PropertyRefinements _refinements = const PropertyRefinements();

  PropertyResultsQuery get _query => (criteria: _criteria, refinements: _refinements);

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
    _criteria = widget.criteria ??
        ShortStaySearchCriteria(
          propertyType: PropertyType.apartment,
          location: 'Cebu City',
          checkIn: DateTime.now().add(const Duration(days: 7)),
          checkOut: DateTime.now().add(const Duration(days: 9)),
          guests: 2,
        );
    _scroll.addListener(_maybeLoadMore);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _scroll.removeListener(_maybeLoadMore);
    _scroll.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _maybeLoadMore() {
    if (!_scroll.hasClients) return;
    final position = _scroll.position;
    if (position.pixels >= position.maxScrollExtent - 500) {
      ref.read(propertyResultsProvider(_query).notifier).loadMore();
    }
  }

  void _refine(PropertyRefinements next) {
    if (next == _refinements) return;
    setState(() => _refinements = next);
  }

  void _onKeywordChanged(String value) {
    setState(() {});
    _debounce?.cancel();
    _debounce = Timer(
      const Duration(milliseconds: 350),
      () => _refine(_refinements.copyWith(keyword: value)),
    );
  }

  void _clearKeyword() {
    _debounce?.cancel();
    _searchController.clear();
    _refine(_refinements.copyWith(keyword: ''));
  }

  Future<void> _pick<T>({
    required String title,
    required List<(String, T)> options,
    required T selected,
    required ValueChanged<T> onPick,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Material(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(Tokens.rLg)),
        clipBehavior: Clip.antiAlias,
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 8, bottom: 8),
                  width: 32,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE5E7EB),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(Tokens.gutter, 4, Tokens.gutter, 4),
                child: Text(title, style: Theme.of(ctx).textTheme.titleMedium),
              ),
              for (final (label, value) in options)
                ListTile(
                  title: Text(label),
                  selected: value == selected,
                  trailing: value == selected ? const Icon(Icons.check, color: Tokens.primaryBlue) : null,
                  onTap: () {
                    Navigator.pop(ctx);
                    onPick(value);
                  },
                ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  void _showSortSheet() => _pick<PropertySortOrder>(
        title: 'Sort by',
        options: [for (final o in PropertySortOrder.values) (o.label, o)],
        selected: _refinements.sort,
        onPick: (o) => _refine(_refinements.copyWith(sort: o)),
      );

  void _showPriceSheet() {
    final monthly = _criteria is MonthlySearchCriteria;
    final steps = monthly
        ? const <int?>[null, 1000000, 1500000, 2500000, 4000000]
        : const <int?>[null, 250000, 400000, 600000, 1000000];
    _pick<int?>(
      title: monthly ? 'Monthly rent' : 'Nightly rate',
      options: [
        for (final s in steps) (s == null ? 'Any price' : 'Up to ${Money.peso(s)}', s),
      ],
      selected: _refinements.maxPriceCentavos,
      onPick: (v) => _refine(_refinements.copyWith(maxPriceCentavos: v, clearMaxPrice: v == null)),
    );
  }

  void _showBedroomsSheet() => _pick<int?>(
        title: 'Bedrooms',
        options: const [('Any', null), ('1 or more', 1), ('2 or more', 2), ('3 or more', 3)],
        selected: _refinements.minBedrooms,
        onPick: (v) => _refine(_refinements.copyWith(minBedrooms: v, clearMinBedrooms: v == null)),
      );

  @override
  Widget build(BuildContext context) {
    final criteria = _criteria;
    final resultsAsync = ref.watch(propertyResultsProvider(_query));
    final state = resultsAsync.valueOrNull;

    final title = '${criteria.propertyType.pluralLabel} in ${criteria.location}';
    final hint = 'Search ${criteria.propertyType.pluralLabel.toLowerCase()}...';
    const countStyle = TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Tokens.muted);

    return Scaffold(
      backgroundColor: Tokens.canvas,
      appBar: AppBar(
        backgroundColor: Tokens.canvas,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          tooltip: 'Back',
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Tokens.primaryNavy),
          onPressed: () => context.pop(),
        ),
        title: Text(
          title,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Tokens.primaryNavy),
        ),
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter, vertical: Tokens.s8),
              child: Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Tokens.hairline),
                  boxShadow: const [BoxShadow(color: Color(0x05000000), blurRadius: 4, offset: Offset(0, 1))],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.search_rounded, size: 20, color: Tokens.muted),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onChanged: _onKeywordChanged,
                        textInputAction: TextInputAction.search,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Tokens.ink),
                        decoration: InputDecoration(
                          isDense: true,
                          filled: false,
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: EdgeInsets.zero,
                          hintText: hint,
                          hintStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: Tokens.muted),
                        ),
                      ),
                    ),
                    if (_searchController.text.isNotEmpty)
                      IconButton(
                        tooltip: 'Clear search',
                        visualDensity: VisualDensity.compact,
                        onPressed: _clearKeyword,
                        icon: const Icon(Icons.cancel_rounded, size: 18, color: Tokens.muted),
                      ),
                  ],
                ),
              ),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: Tokens.scroll,
              padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter, vertical: Tokens.s4),
              child: Row(
                children: [
                  _FilterPill(
                    label: _refinements.sort == PropertySortOrder.recommended ? 'Sort' : _refinements.sort.label,
                    icon: Icons.sort_rounded,
                    isActive: _refinements.sort != PropertySortOrder.recommended,
                    onTap: _showSortSheet,
                  ),
                  const SizedBox(width: 8),
                  _FilterPill(
                    label: _refinements.maxPriceCentavos == null
                        ? 'Price'
                        : 'Up to ${Money.peso(_refinements.maxPriceCentavos!)}',
                    icon: Icons.payments_outlined,
                    isActive: _refinements.maxPriceCentavos != null,
                    onTap: _showPriceSheet,
                  ),
                  const SizedBox(width: 8),
                  _FilterPill(
                    label: _refinements.minBedrooms == null ? 'Bedrooms' : '${_refinements.minBedrooms}+ bedrooms',
                    icon: Icons.bed_outlined,
                    isActive: _refinements.minBedrooms != null,
                    onTap: _showBedroomsSheet,
                  ),
                  if (_refinements.isActive) ...[
                    const SizedBox(width: 8),
                    _FilterPill(
                      label: 'Reset',
                      icon: Icons.close_rounded,
                      isActive: false,
                      onTap: () {
                        _debounce?.cancel();
                        _searchController.clear();
                        _refine(const PropertyRefinements());
                      },
                    ),
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s12, Tokens.gutter, Tokens.s8),
              child: Semantics(
                liveRegion: true,
                child: Text(
                  switch (resultsAsync) {
                    AsyncError() when state == null => 'Search unavailable',
                    _ when state == null => 'Searching…',
                    _ => '${state.total} ${state.total == 1 ? "place" : "places"}',
                  },
                  style: countStyle,
                ),
              ),
            ),
            Expanded(
              child: switch (resultsAsync) {
                AsyncError(:final error) when state == null => ErrorState(
                    title: 'Could not load listings',
                    message: error is ApiException ? error.message : 'Check your connection and try again.',
                    onRetry: () => ref.invalidate(propertyResultsProvider(_query)),
                  ),
                _ when state == null => const Center(
                    child: CircularProgressIndicator(strokeWidth: 2.5, color: Tokens.primaryNavy),
                  ),
                _ when state.items.isEmpty => EmptyState(
                    icon: Icons.search_off_rounded,
                    title: 'No ${criteria.propertyType.pluralLabel.toLowerCase()} found',
                    message: _refinements.isActive
                        ? 'Nothing matches these filters. Try a wider price range or fewer bedrooms.'
                        : 'Nothing is open for these dates yet. Try different dates or another area.',
                    actionLabel: _refinements.isActive ? 'Reset filters' : null,
                    onAction: _refinements.isActive
                        ? () {
                            _searchController.clear();
                            _refine(const PropertyRefinements());
                          }
                        : null,
                  ),
                _ => RefreshIndicator(
                    color: Tokens.primaryNavy,
                    onRefresh: () async {
                      ref.invalidate(propertyResultsProvider(_query));
                      await ref.read(propertyResultsProvider(_query).future).then((_) {}, onError: (_) {});
                    },
                    child: ListView.separated(
                      controller: _scroll,
                      physics: const AlwaysScrollableScrollPhysics(parent: Tokens.scroll),
                      padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s4, Tokens.gutter, Tokens.s24),
                      itemCount: state.items.length + 1,
                      separatorBuilder: (_, __) => const SizedBox(height: 20),
                      itemBuilder: (context, index) {
                        if (index == state.items.length) {
                          return _ResultsFooter(
                            state: state,
                            onMore: () => ref.read(propertyResultsProvider(_query).notifier).loadMore(),
                          );
                        }
                        final item = state.items[index];
                        return ListingCard(
                          listing: item,
                          onTap: () => context.push(Routes.listing(item.id)),
                        );
                      },
                    ),
                  ),
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ResultsFooter extends StatelessWidget {
  const _ResultsFooter({required this.state, required this.onMore});

  final PropertyResultsState state;
  final VoidCallback onMore;

  @override
  Widget build(BuildContext context) {
    if (state.loadingMore) {
      return const Center(
        child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.2)),
      );
    }
    if (state.loadMoreError != null) {
      return Center(
        child: TextButton.icon(
          onPressed: onMore,
          icon: const Icon(Icons.refresh, size: 18),
          label: const Text('Couldn’t load more. Try again'),
        ),
      );
    }
    if (state.hasMore) {
      return Center(child: TextButton(onPressed: onMore, child: const Text('Show more places')));
    }
    return const SizedBox(height: Tokens.s8);
  }
}

class _FilterPill extends StatelessWidget {
  const _FilterPill({
    required this.label,
    required this.icon,
    required this.isActive,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: Container(
        height: 34,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: isActive ? Tokens.softBlue : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive ? Tokens.primaryBlue : Tokens.hairline,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: isActive ? Tokens.primaryBlue : Tokens.primaryNavy,
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                color: isActive ? Tokens.primaryBlue : Tokens.primaryNavy,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
