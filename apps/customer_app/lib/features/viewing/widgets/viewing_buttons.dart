import 'package:flutter/material.dart';

import '../../../design/tokens.dart';
import 'viewing_icon.dart';

class ViewingPrimaryButton extends StatelessWidget {
  const ViewingPrimaryButton({required this.label, required this.onPressed, this.busy = false, this.glyph, super.key});

  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final ViewingGlyph? glyph;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: busy ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: Tokens.primaryNavy,
        disabledBackgroundColor: Tokens.primaryNavy.withValues(alpha: 0.32),
        foregroundColor: Colors.white,
        disabledForegroundColor: Colors.white,
        minimumSize: const Size.fromHeight(Tokens.secondaryButtonHeight + 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Tokens.rControl)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, letterSpacing: -0.1),
      ),
      child: busy
          ? const SizedBox(
              width: Tokens.spinner,
              height: Tokens.spinner,
              child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
            )
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (glyph != null) ...[
                  ViewingIcon(glyph!, size: Tokens.iconMd, color: Colors.white),
                  const SizedBox(width: Tokens.s8),
                ],
                Flexible(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis)),
              ],
            ),
    );
  }
}

class ViewingSecondaryButton extends StatelessWidget {
  const ViewingSecondaryButton({required this.label, required this.onPressed, this.glyph, super.key});

  final String label;
  final VoidCallback? onPressed;
  final ViewingGlyph? glyph;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: Tokens.primaryNavy,
        backgroundColor: Tokens.card,
        minimumSize: const Size.fromHeight(Tokens.secondaryButtonHeight + 2),
        side: const BorderSide(color: Tokens.primaryNavy, width: 1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Tokens.rControl)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, letterSpacing: -0.1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (glyph != null) ...[
            ViewingIcon(glyph!, size: Tokens.iconMd),
            const SizedBox(width: Tokens.s8),
          ],
          Flexible(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }
}
