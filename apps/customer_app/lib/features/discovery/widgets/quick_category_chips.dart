import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../design/tokens.dart';

enum PropertyCategory {
  apartment('Apartment', Icons.apartment_outlined),
  condo('Condo', Icons.corporate_fare_outlined),
  house('House', Icons.home_outlined),
  room('Room', Icons.single_bed_outlined),
  boardingHouse('Boarding House', Icons.domain_outlined);

  const PropertyCategory(this.label, this.icon);
  final String label;
  final IconData icon;
}

class PropertyCategoryList extends StatelessWidget {
  const PropertyCategoryList({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final PropertyCategory selected;
  final ValueChanged<PropertyCategory> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 64,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: Tokens.scroll,
        padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
        itemCount: PropertyCategory.values.length,
        separatorBuilder: (_, __) => const SizedBox(width: 9),
        itemBuilder: (context, index) {
          final cat = PropertyCategory.values[index];
          final isSelected = cat == selected;

          return GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              HapticFeedback.selectionClick();
              onSelected(cat);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              curve: Curves.easeOut,
              width: 76,
              height: 64,
              padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
              decoration: BoxDecoration(
                color: isSelected ? Tokens.softBlue : const Color(0xFFF7F8FA),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected
                      ? Colors.transparent
                      : const Color(0xFFE7E8EC).withOpacity(0.6),
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    cat.icon,
                    size: 21,
                    color: isSelected ? Tokens.primaryBlue : Tokens.primaryNavy,
                  ),
                  const SizedBox(height: 4),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      cat.label,
                      maxLines: 1,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight:
                            isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? Tokens.primaryNavy : Tokens.muted,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

typedef QuickCategory = PropertyCategory;
typedef QuickCategoryChips = PropertyCategoryList;
