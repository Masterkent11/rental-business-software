import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/messaging_repository.dart';
import '../../design/glass_bottom_nav.dart';
import '../../data/tenant_home_repository.dart';
import '../../data/notification_repository.dart';

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.invalidate(customerExperienceProvider);
      ref.invalidate(tenancyDetailsProvider);
    }
  }

  @override
  Widget build(BuildContext context) {
    final experience = ref.watch(customerExperienceProvider);
    final unread = ref.watch(inboxProvider.select((inbox) => inbox.valueOrNull?.unreadTotal ?? 0));
    ref.listen(notificationsProvider, (previous, next) {
      final before = previous?.valueOrNull?.map((item) => item.id).join(',');
      final after = next.valueOrNull?.map((item) => item.id).join(',');
      if (before != null && after != null && before != after) {
        ref.invalidate(customerExperienceProvider);
        ref.invalidate(tenancyDetailsProvider);
      }
    });

    return Scaffold(
      extendBody: true,
      body: widget.navigationShell,
      bottomNavigationBar: GlassBottomNav(
        tenantMode: !experience.isLoading && !experience.hasError && (experience.valueOrNull?.myHomeAvailable ?? false),
        selectedIndex: widget.navigationShell.currentIndex,
        unreadMessages: unread,
        onSelected: (index) {
          widget.navigationShell.goBranch(
            index,
            initialLocation: index == widget.navigationShell.currentIndex,
          );
        },
      ),
    );
  }
}
