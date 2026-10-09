import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/api_client.dart';
import '../../data/content_repository.dart';
import '../../design/components.dart';
import '../../design/tokens.dart';
import '../../design/typography.dart';
import 'content_body.dart';

class ContentPageScreen extends ConsumerWidget {
  const ContentPageScreen({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(contentPageProvider(slug));
    return Scaffold(
      appBar: AppBar(title: Text(async.valueOrNull?.title ?? '')),
      body: switch (async) {
        AsyncData(:final value) => ListView(
            padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s40),
            children: [ContentDocument(page: value)],
          ),
        AsyncError(:final error) => ContentErrorState(slug: slug, error: error),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class ContentDocument extends StatelessWidget {
  const ContentDocument({required this.page, super.key});

  final ContentPageView page;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (page.isDraft) const DraftNotice(),
        Text(page.title, style: AppText.pageTitle),
        const SizedBox(height: Tokens.s4),
        Text(
          page.effectiveOn == null
              ? 'Version ${page.version}'
              : 'Version ${page.version} · effective ${page.effectiveOn}',
          style: AppText.caption,
        ),
        const SizedBox(height: Tokens.s8),
        ContentBody(body: page.body),
      ],
    );
  }
}

class ContentErrorState extends ConsumerWidget {
  const ContentErrorState({required this.slug, required this.error, super.key});

  final String slug;
  final Object error;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final failure = error;
    return ErrorState(
      title: 'Couldn’t open this page',
      message: failure is ApiException && failure.isNotFound
          ? 'This page isn’t available.'
          : 'Check your connection and try again.',
      onRetry: () => ref.invalidate(contentPageProvider(slug)),
    );
  }
}

class DraftNotice extends StatelessWidget {
  const DraftNotice({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: Tokens.s16),
      padding: const EdgeInsets.all(Tokens.s12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF6E5),
        borderRadius: BorderRadius.circular(Tokens.rControl),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFF7A4B00)),
          SizedBox(width: Tokens.s8),
          Expanded(
            child: Text(
              'Draft — this document is pending legal and business review before public launch.',
              style: TextStyle(fontSize: 13, color: Color(0xFF7A4B00), height: 1.35),
            ),
          ),
        ],
      ),
    );
  }
}
