import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../data/content_repository.dart';
import '../../../../design/components.dart';
import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../../legal/content_sheet.dart';
import '../../../legal/legal_document.dart';
import 'info_section.dart';

class FaqSection extends ConsumerWidget {
  const FaqSection({super.key});

  static const int maxQuestions = 4;
  static const List<LegalDocument> policies = [LegalDocument.bookingPolicy, LegalDocument.terms];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final articles = ref.watch(helpArticlesProvider);
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
      sliver: SliverList.list(
        children: [
          const InfoSectionTitle('Frequently asked questions'),
          ...switch (articles) {
            AsyncData(:final value) => [
                for (final article in value.take(maxQuestions)) InfoTile(child: _Question(article: article)),
              ],
            AsyncError() => [
                InfoTile(
                  child: AppInlineNotice(
                    icon: Icons.cloud_off_outlined,
                    message: 'Questions are unavailable right now.',
                    trailing: AppTextAction(label: 'Retry', onPressed: () => ref.invalidate(helpArticlesProvider)),
                  ),
                ),
              ],
            _ => [
                for (var i = 0; i < 2; i++)
                  const Padding(
                    padding: EdgeInsets.only(bottom: Tokens.s8),
                    child: SkeletonBox(height: Tokens.fieldHeight, radius: Tokens.rControl),
                  ),
              ],
          },
          for (final policy in policies)
            InfoTile(
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: Tokens.s12),
                leading: const Icon(Icons.description_outlined, size: Tokens.controlIcon, color: Tokens.primaryNavy),
                title: Text(policy.title, style: AppText.control),
                trailing: const Icon(Icons.chevron_right_rounded, color: Tokens.primaryNavy),
                onTap: () => showContentSheet(context, policy.slug),
              ),
            ),
        ],
      ),
    );
  }
}

class _Question extends StatelessWidget {
  const _Question({required this.article});

  final ContentPageView article;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: Tokens.s12),
        childrenPadding: const EdgeInsets.fromLTRB(Tokens.s12, 0, Tokens.s12, Tokens.s8),
        shape: const Border(),
        collapsedShape: const Border(),
        iconColor: Tokens.primaryNavy,
        collapsedIconColor: Tokens.primaryNavy,
        leading: const Icon(Icons.help_outline_rounded, size: Tokens.controlIcon, color: Tokens.primaryNavy),
        title: Text(article.title, style: AppText.control),
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(article.summary, style: AppText.caption),
          AppTextAction(label: 'Read more', onPressed: () => showContentSheet(context, article.slug)),
        ],
      ),
    );
  }
}
