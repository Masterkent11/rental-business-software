import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../design/tokens.dart';
import '../../domain/rental_mode.dart';

class SearchModeToggle extends StatelessWidget {
  const SearchModeToggle({
    super.key,
    required this.selectedMode,
    required this.onChanged,
  });

  final RentalMode selectedMode;
  final ValueChanged<RentalMode> onChanged;

  @override
  Widget build(BuildContext context) {
    final isShortStay = selectedMode == RentalMode.shortStay;

    return Container(
      height: 42,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F2F4),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Stack(
        children: [
          AnimatedAlign(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOutCubic,
            alignment: isShortStay ? Alignment.centerLeft : Alignment.centerRight,
            child: FractionallySizedBox(
              widthFactor: 0.5,
              heightFactor: 1.0,
              child: Container(
                decoration: BoxDecoration(
                  color: Tokens.primaryNavy,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x12000000),
                      blurRadius: 4,
                      offset: Offset(0, 1),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    onChanged(RentalMode.shortStay);
                  },
                  child: Center(
                    child: Text(
                      'Short stay',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight:
                            isShortStay ? FontWeight.w600 : FontWeight.w500,
                        color: isShortStay ? Colors.white : Tokens.muted,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    onChanged(RentalMode.monthly);
                  },
                  child: Center(
                    child: Text(
                      'Monthly rental',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight:
                            !isShortStay ? FontWeight.w600 : FontWeight.w500,
                        color: !isShortStay ? Colors.white : Tokens.muted,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
