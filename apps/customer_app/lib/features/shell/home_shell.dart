import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/messaging_repository.dart';
import '../../design/glass_bottom_nav.dart';

class HomeShell extends ConsumerWidget {
  const HomeShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(inboxProvider.select((inbox) => inbox.valueOrNull?.unreadTotal ?? 0));

    return Scaffold(
      extendBody: true,
      body: navigationShell,
      bottomNavigationBar: GlassBottomNav(
        selectedIndex: navigationShell.currentIndex,
        unreadMessages: unread,
        onSelected: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
      ),
    );
  }
}
