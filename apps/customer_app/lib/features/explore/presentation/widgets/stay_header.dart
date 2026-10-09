import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import 'currency_button.dart';

class StayHeader extends StatelessWidget {
  const StayHeader({this.title, super.key});

  final String? title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(Tokens.s4, Tokens.s4, Tokens.gutter, 0),
      child: Row(
        children: [
          if (context.canPop())
            AppIconButton(icon: Icons.arrow_back_ios_new_rounded, semanticLabel: 'Back', onPressed: () => context.pop())
          else
            const SizedBox(width: Tokens.tap),
          Expanded(
            child: title == null
                ? const SizedBox.shrink()
                : Text(title!, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.sectionTitle),
          ),
          const CurrencyButton(),
        ],
      ),
    );
  }
}
