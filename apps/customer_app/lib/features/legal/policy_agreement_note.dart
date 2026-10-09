import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../design/tokens.dart';
import '../../design/typography.dart';

class PolicyAgreementNote extends StatelessWidget {
  const PolicyAgreementNote({required this.prefix, required this.links, super.key});

  final String prefix;
  final List<(String, String)> links;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: Tokens.s12),
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Text(prefix, style: AppText.caption),
          for (final (index, (label, slug)) in links.indexed) ...[
            if (index > 0) const Text(' and ', style: AppText.caption),
            Semantics(
              link: true,
              label: label,
              excludeSemantics: true,
              child: GestureDetector(
                onTap: () => context.push(Routes.legal(slug)),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: Tokens.tap),
                  child: Center(
                    widthFactor: 1,
                    child: Text(
                      label,
                      style: AppText.captionStrong.copyWith(decoration: TextDecoration.underline),
                    ),
                  ),
                ),
              ),
            ),
          ],
          const Text('.', style: AppText.caption),
        ],
      ),
    );
  }
}
