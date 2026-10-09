import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/content_repository.dart';
import '../../design/components.dart';
import '../../design/controls.dart';
import '../../design/tokens.dart';
import '../../design/typography.dart';
import 'legal_document.dart';

class HelpCenterScreen extends ConsumerWidget {
  const HelpCenterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final articles = ref.watch(helpArticlesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Help & Support')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s40),
        children: [
          const Text('How can we help?', style: AppText.pageTitle),
          const SizedBox(height: Tokens.s4),
          const Text('Answers about booking, renting, buying and using Westayplace.', style: AppText.supporting),
          const AppSectionHeader(
              title: 'Common questions', padding: EdgeInsets.only(top: Tokens.s20, bottom: Tokens.s8)),
          ...switch (articles) {
            AsyncData(:final value) when value.isEmpty => const [
                Text('No help articles yet.', style: AppText.supporting)
              ],
            AsyncData(:final value) => [
                for (final article in value)
                  SettingsRow(
                    icon: Icons.help_outline_rounded,
                    label: article.title,
                    onTap: () => context.push(Routes.helpArticle(article.slug)),
                  ),
              ],
            AsyncError() => [
                ErrorState(
                  title: 'Couldn’t load help articles',
                  message: 'Check your connection and try again.',
                  onRetry: () => ref.invalidate(helpArticlesProvider),
                ),
              ],
            _ => const [
                Padding(padding: EdgeInsets.all(Tokens.s24), child: Center(child: CircularProgressIndicator()))
              ],
          },
          const AppSectionHeader(title: 'Policies', padding: EdgeInsets.only(top: Tokens.s20, bottom: Tokens.s8)),
          for (final document in LegalDocument.values)
            SettingsRow(
              icon: Icons.description_outlined,
              label: document.title,
              onTap: () => context.push(Routes.legal(document.slug)),
            ),
          const SizedBox(height: Tokens.s24),
          AppButton(
              label: 'Contact support',
              icon: Icons.support_agent_rounded,
              onPressed: () => context.push(Routes.contactSupport())),
        ],
      ),
    );
  }
}
