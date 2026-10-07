import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../design/tokens.dart';
import '../../../fixtures/view_models.dart';
import '../../discovery/filters_sheet.dart';
import '../../discovery/widgets/listing_card.dart';
import '../application/property_search_controller.dart';
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
  String _filterKeyword = '';
  String? _sortBy;
  int? _maxPrice;
  int? _minBeds;

  PropertySearchCriteria get _effectiveCriteria {
    return widget.criteria ??
        ShortStaySearchCriteria(
          propertyType: PropertyType.apartment,
          location: 'Cebu City',
          checkIn: DateTime.now().add(const Duration(days: 7)),
          checkOut: DateTime.now().add(const Duration(days: 9)),
          guests: 2,
        );
  }

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<ListingCardView> _applyFilters(List<ListingCardView> source) {
    var items = List<ListingCardView>.from(source);
    if (_filterKeyword.trim().isNotEmpty) {
      final term = _filterKeyword.trim().toLowerCase();
      items = items.where((l) {
        return l.title.toLowerCase().contains(term) ||
            l.propertyName.toLowerCase().contains(term) ||
            l.areaLabel.toLowerCase().contains(term) ||
            l.cityLabel.toLowerCase().contains(term);
      }).toList();
    }
    if (_maxPrice != null) {
      items = items.where((l) => l.priceCentavos <= _maxPrice!).toList();
    }
    if (_minBeds != null) {
      items = items.where((l) => l.beds >= _minBeds!).toList();
    }
    if (_sortBy == 'price_low') {
      items.sort((a, b) => a.priceCentavos.compareTo(b.priceCentavos));
    } else if (_sortBy == 'price_high') {
      items.sort((a, b) => b.priceCentavos.compareTo(a.priceCentavos));
    } else if (_sortBy == 'rating') {
      items.sort((a, b) => (b.rating ?? 0).compareTo(a.rating ?? 0));
    }
    return items;
  }

  void _showSortSheet() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Material(
        color: Colors.white,
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(Tokens.rLg)),
        clipBehavior: Clip.antiAlias,
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 8, bottom: 8),
                width: 32,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              ListTile(
                title: const Text('Featured'),
                trailing: _sortBy == null
                    ? const Icon(Icons.check, color: Tokens.primaryBlue)
                    : null,
                onTap: () {
                  setState(() => _sortBy = null);
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                title: const Text('Price: Low to High'),
                trailing: _sortBy == 'price_low'
                    ? const Icon(Icons.check, color: Tokens.primaryBlue)
                    : null,
                onTap: () {
                  setState(() => _sortBy = 'price_low');
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                title: const Text('Price: High to Low'),
                trailing: _sortBy == 'price_high'
                    ? const Icon(Icons.check, color: Tokens.primaryBlue)
                    : null,
                onTap: () {
                  setState(() => _sortBy = 'price_high');
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                title: const Text('Highest Rated'),
                trailing: _sortBy == 'rating'
                    ? const Icon(Icons.check, color: Tokens.primaryBlue)
                    : null,
                onTap: () {
                  setState(() => _sortBy = 'rating');
                  Navigator.pop(ctx);
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  void _showPriceSheet() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Material(
        color: Colors.white,
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(Tokens.rLg)),
        clipBehavior: Clip.antiAlias,
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 8, bottom: 8),
                width: 32,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              ListTile(
                title: const Text('Any price'),
                trailing: _maxPrice == null
                    ? const Icon(Icons.check, color: Tokens.primaryBlue)
                    : null,
                onTap: () {
                  setState(() => _maxPrice = null);
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                title: const Text('Under ₱5,000'),
                trailing: _maxPrice == 500000
                    ? const Icon(Icons.check, color: Tokens.primaryBlue)
                    : null,
                onTap: () {
                  setState(() => _maxPrice = 500000);
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                title: const Text('Under ₱15,000'),
                trailing: _maxPrice == 1500000
                    ? const Icon(Icons.check, color: Tokens.primaryBlue)
                    : null,
                onTap: () {
                  setState(() => _maxPrice = 1500000);
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                title: const Text('Under ₱30,000'),
                trailing: _maxPrice == 3000000
                    ? const Icon(Icons.check, color: Tokens.primaryBlue)
                    : null,
                onTap: () {
                  setState(() => _maxPrice = 3000000);
                  Navigator.pop(ctx);
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  void _showBedroomsSheet() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Material(
        color: Colors.white,
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(Tokens.rLg)),
        clipBehavior: Clip.antiAlias,
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 8, bottom: 8),
                width: 32,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              ListTile(
                title: const Text('Any bedrooms'),
                trailing: _minBeds == null
                    ? const Icon(Icons.check, color: Tokens.primaryBlue)
                    : null,
                onTap: () {
                  setState(() => _minBeds = null);
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                title: const Text('1+ Bedrooms'),
                trailing: _minBeds == 1
                    ? const Icon(Icons.check, color: Tokens.primaryBlue)
                    : null,
                onTap: () {
                  setState(() => _minBeds = 1);
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                title: const Text('2+ Bedrooms'),
                trailing: _minBeds == 2
                    ? const Icon(Icons.check, color: Tokens.primaryBlue)
                    : null,
                onTap: () {
                  setState(() => _minBeds = 2);
                  Navigator.pop(ctx);
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final criteria = _effectiveCriteria;
    final resultsAsync = ref.watch(propertyResultsProvider(criteria));

    final title = '${criteria.propertyType.pluralLabel} in ${criteria.location}';
    final hint = 'Search ${criteria.propertyType.pluralLabel.toLowerCase()}...';

    return Scaffold(
      backgroundColor: Tokens.canvas,
      appBar: AppBar(
        backgroundColor: Tokens.canvas,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: Tokens.primaryNavy,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: Tokens.primaryNavy,
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: Tokens.gutter,
                vertical: Tokens.s8,
              ),
              child: Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Tokens.hairline),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x05000000),
                      blurRadius: 4,
                      offset: Offset(0, 1),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.search_rounded,
                      size: 20,
                      color: Tokens.muted,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onChanged: (val) {
                          setState(() => _filterKeyword = val);
                        },
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Tokens.ink,
                        ),
                        decoration: InputDecoration(
                          isDense: true,
                          filled: false,
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: EdgeInsets.zero,
                          hintText: hint,
                          hintStyle: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            color: Tokens.muted,
                          ),
                        ),
                      ),
                    ),
                    if (_filterKeyword.isNotEmpty)
                      GestureDetector(
                        onTap: () {
                          _searchController.clear();
                          setState(() => _filterKeyword = '');
                        },
                        child: const Icon(
                          Icons.cancel_rounded,
                          size: 18,
                          color: Tokens.muted,
                        ),
                      ),
                  ],
                ),
              ),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: Tokens.scroll,
              padding: const EdgeInsets.symmetric(
                horizontal: Tokens.gutter,
                vertical: Tokens.s4,
              ),
              child: Row(
                children: [
                  _FilterPill(
                    label: _sortBy == null ? 'Sort' : 'Sorted',
                    icon: Icons.sort_rounded,
                    isActive: _sortBy != null,
                    onTap: _showSortSheet,
                  ),
                  const SizedBox(width: 8),
                  _FilterPill(
                    label: _maxPrice == null ? 'Price' : 'Price set',
                    icon: Icons.attach_money_rounded,
                    isActive: _maxPrice != null,
                    onTap: _showPriceSheet,
                  ),
                  const SizedBox(width: 8),
                  _FilterPill(
                    label: _minBeds == null ? 'Bedrooms' : '$_minBeds+ Beds',
                    icon: Icons.bed_outlined,
                    isActive: _minBeds != null,
                    onTap: _showBedroomsSheet,
                  ),
                  const SizedBox(width: 8),
                  _FilterPill(
                    label: 'More',
                    icon: Icons.tune_rounded,
                    isActive: false,
                    onTap: () => showFiltersSheet(context),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Tokens.gutter,
                Tokens.s12,
                Tokens.gutter,
                Tokens.s8,
              ),
              child: resultsAsync.when(
                data: (raw) {
                  final items = _applyFilters(raw);
                  return Text(
                    '${items.length} ${items.length == 1 ? "place" : "places"}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Tokens.muted,
                    ),
                  );
                },
                loading: () => const Text(
                  'Searching...',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Tokens.muted,
                  ),
                ),
                error: (_, __) => const Text(
                  '0 places',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Tokens.muted,
                  ),
                ),
              ),
            ),
            Expanded(
              child: resultsAsync.when(
                data: (raw) {
                  final items = _applyFilters(raw);
                  if (items.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(Tokens.gutter),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.search_off_rounded,
                              size: 48,
                              color: Tokens.muted,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'No ${criteria.propertyType.pluralLabel.toLowerCase()} found',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Tokens.primaryNavy,
                              ),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Try adjusting your search criteria or filters.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 13,
                                color: Tokens.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return ListView.separated(
                    physics: Tokens.scroll,
                    padding: const EdgeInsets.fromLTRB(
                      Tokens.gutter,
                      Tokens.s4,
                      Tokens.gutter,
                      Tokens.s24,
                    ),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 20),
                    itemBuilder: (context, index) {
                      final item = items[index];
                      return ListingCard(
                        listing: item,
                        onTap: () => context.push(Routes.listing(item.id)),
                      );
                    },
                  );
                },
                loading: () => const Center(
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Tokens.primaryNavy,
                  ),
                ),
                error: (err, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(Tokens.gutter),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline_rounded,
                          size: 44,
                          color: Tokens.muted,
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Could not load listings',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Tokens.primaryNavy,
                          ),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () => ref.refresh(
                            propertyResultsProvider(criteria),
                          ),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
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
