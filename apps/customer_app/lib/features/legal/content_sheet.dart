import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/content_repository.dart';
import '../../design/tokens.dart';
import 'content_page_screen.dart';

Future<void> showContentSheet(BuildContext context, String slug) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Tokens.canvas,
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.62,
        minChildSize: 0.35,
        maxChildSize: 0.95,
        snap: true,
        builder: (context, controller) => _ContentSheetBody(slug: slug, controller: controller),
      ),
    );

class _ContentSheetBody extends ConsumerWidget {
  const _ContentSheetBody({required this.slug, required this.controller});

  final String slug;
  final ScrollController controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(contentPageProvider(slug));
    return ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s40),
      children: [
        switch (async) {
          AsyncData(:final value) => ContentDocument(page: value),
          AsyncError(:final error) => ContentErrorState(slug: slug, error: error),
          _ => const Padding(
              padding: EdgeInsets.symmetric(vertical: Tokens.s40),
              child: Center(child: CircularProgressIndicator()),
            ),
        },
      ],
    );
  }
}
