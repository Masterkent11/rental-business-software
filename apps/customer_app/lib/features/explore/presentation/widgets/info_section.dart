import 'package:flutter/material.dart';

import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';

class InfoSectionTitle extends StatelessWidget {
  const InfoSectionTitle(this.title, {super.key});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: Tokens.s24, bottom: Tokens.s8),
      child: Text(title, style: AppText.sectionTitle),
    );
  }
}

class InfoTile extends StatelessWidget {
  const InfoTile({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Tokens.s8),
      child: Material(
        color: Colors.white,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Tokens.rControl),
          side: const BorderSide(color: Tokens.hairline),
        ),
        child: child,
      ),
    );
  }
}
