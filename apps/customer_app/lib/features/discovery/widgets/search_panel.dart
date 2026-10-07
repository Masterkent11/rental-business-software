import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../design/tokens.dart';
import '../discovery_controller.dart';
import '../filters_sheet.dart';

class SearchPanel extends ConsumerStatefulWidget {
  const SearchPanel({
    super.key,
    required this.onSearch,
    this.onFilter,
  });

  final VoidCallback onSearch;
  final VoidCallback? onFilter;

  @override
  ConsumerState<SearchPanel> createState() => _SearchPanelState();
}

class _SearchPanelState extends ConsumerState<SearchPanel> {
  late final TextEditingController _whereController;

  @override
  void initState() {
    super.initState();
    _whereController = TextEditingController(
      text: ref.read(searchCriteriaProvider).destination,
    );
  }

  @override
  void dispose() {
    _whereController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final criteria = ref.watch(searchCriteriaProvider);
    final controller = ref.read(searchCriteriaProvider.notifier);
    final filters = ref.watch(filtersProvider);

    if (_whereController.text != criteria.destination) {
      _whereController.value = TextEditingValue(
        text: criteria.destination,
        selection: TextSelection.collapsed(offset: criteria.destination.length),
      );
    }

    return Row(
      children: [
        Expanded(
          child: Container(
            height: 46,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Tokens.hairline),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x05000000),
                  blurRadius: 6,
                  offset: Offset(0, 2),
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
                    controller: _whereController,
                    onChanged: (val) {
                      controller.setDestination(val);
                      controller.apply();
                    },
                    onSubmitted: (_) {
                      controller.apply();
                      widget.onSearch();
                    },
                    textInputAction: TextInputAction.search,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Tokens.ink,
                    ),
                    decoration: const InputDecoration(
                      isDense: true,
                      filled: false,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                      hintText: 'Search location, property, or keyword',
                      hintStyle: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: Tokens.muted,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 10),
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: widget.onFilter ?? () => showFiltersSheet(context),
          child: Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Tokens.hairline),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x05000000),
                  blurRadius: 6,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                const Icon(
                  Icons.tune_rounded,
                  size: 19,
                  color: Tokens.primaryNavy,
                ),
                if (filters.activeCount > 0)
                  Positioned(
                    top: 9,
                    right: 9,
                    child: Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: Tokens.primaryBlue,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
