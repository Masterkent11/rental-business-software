import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/account_repository.dart';
import '../../data/api_client.dart';
import '../../data/auth_repository.dart';
import '../../data/booking_repository.dart';
import '../../data/listing_repository.dart';
import '../../data/messaging_repository.dart';
import '../../data/notification_repository.dart';
import '../../design/components.dart';
import '../../design/tokens.dart';
import '../saved/saved_controller.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  Future<void> _editName(BuildContext context, WidgetRef ref, String current) async {
    final controller = TextEditingController(text: current);
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) => _EditNameSheet(controller: controller),
    );
    if (saved != true) return;
    try {
      await ref.read(accountRepositoryProvider).updateName(controller.text.trim());
      ref.invalidate(accountProvider);
    } on ApiException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You can keep browsing. Sign in again to book or message owners.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Sign out')),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(authRepositoryProvider).signOut();
    ref
      ..invalidate(myBookingsProvider)
      ..invalidate(inboxProvider)
      ..invalidate(notificationsProvider)
      ..invalidate(savedIdsProvider)
      ..invalidate(apiClientProvider);
    if (context.mounted) context.go(Routes.discover);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final signedIn = ref.watch(isSignedInProvider);
    final account = ref.watch(accountProvider);
    final unreadMessages = ref.watch(inboxProvider).valueOrNull?.unreadTotal ?? 0;
    final unreadNotifications = ref.watch(unreadNotificationsProvider);

    return Scaffold(
      body: ListView(
        physics: Tokens.scroll,
        padding: const EdgeInsets.only(bottom: Tokens.s64),
        children: [
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s16, Tokens.gutter, Tokens.s20),
              child: Text('Profile', style: theme.textTheme.displaySmall),
            ),
          ),
          if (!signedIn)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
              child: Container(
                padding: const EdgeInsets.all(Tokens.s20),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(Tokens.rLg),
                  border: Border.all(color: theme.colorScheme.outlineVariant),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Book, message and save', style: theme.textTheme.headlineSmall),
                    const SizedBox(height: Tokens.s8),
                    Text(
                      'Browse freely. Sign in when you’re ready to book a stay, apply for a lease, or talk to an owner.',
                      style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: Tokens.s20),
                    AppButton(label: 'Sign in', onPressed: () => context.push(Routes.auth(from: Routes.account))),
                    const SizedBox(height: Tokens.s12),
                    AppButton(
                      label: 'Create an account',
                      secondary: true,
                      onPressed: () => context.push(Routes.auth(from: Routes.account, mode: 'signup')),
                    ),
                  ],
                ),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
              child: switch (account) {
                AsyncData(:final value?) => Row(
                    children: [
                      InitialsAvatar(name: value.displayName, size: 60),
                      const SizedBox(width: Tokens.s16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(value.displayName.isEmpty ? 'Your profile' : value.displayName, style: theme.textTheme.headlineSmall),
                            if (value.email != null) Text(value.email!, style: theme.textTheme.bodySmall),
                          ],
                        ),
                      ),
                      TextButton(onPressed: () => _editName(context, ref, value.displayName), child: const Text('Edit')),
                    ],
                  ),
                AsyncError(:final error) => ErrorState(
                    message: error is ApiException ? error.message : 'We could not load your profile.',
                    onRetry: () => ref.invalidate(accountProvider),
                  ),
                _ => const Row(
                    children: [
                      SkeletonBox(width: 60, height: 60, radius: 30),
                      SizedBox(width: Tokens.s16),
                      SkeletonBox(width: 160, height: 18),
                    ],
                  ),
              },
            ),
          const SizedBox(height: Tokens.s24),
          SettingsRow(icon: Icons.event_note_outlined, label: 'My bookings', onTap: () => context.go(Routes.bookings)),
          SettingsRow(icon: Icons.description_outlined, label: 'Applications', onTap: () => context.push(Routes.applications)),
          SettingsRow(icon: Icons.favorite_border, label: 'Saved places', onTap: () => context.go(Routes.saved)),
          SettingsRow(
            icon: Icons.chat_bubble_outline,
            label: 'Messages',
            trailing: CountBadge(count: unreadMessages),
            onTap: () => context.go(Routes.messages),
          ),
          SettingsRow(
            icon: Icons.notifications_none,
            label: 'Notifications',
            trailing: CountBadge(count: unreadNotifications),
            onTap: () => context.push(Routes.notifications),
          ),
          if (signedIn) ...[
            const Divider(height: Tokens.s32),
            SettingsRow(icon: Icons.logout, label: 'Sign out', destructive: true, onTap: () => _signOut(context, ref)),
          ],
          Padding(
            padding: const EdgeInsets.all(Tokens.gutter),
            child: Text('Rental Platform · v0.1.0', style: theme.textTheme.bodySmall, textAlign: TextAlign.center),
          ),
        ],
      ),
    );
  }
}

class _EditNameSheet extends StatelessWidget {
  const _EditNameSheet({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        Tokens.gutter,
        Tokens.s8,
        Tokens.gutter,
        Tokens.s20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Your name', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: Tokens.s16),
          AppTextField(
            label: 'Full name',
            controller: controller,
            textCapitalization: TextCapitalization.words,
            autofillHints: const [AutofillHints.name],
            onSubmitted: (_) => Navigator.pop(context, true),
          ),
          const SizedBox(height: Tokens.s20),
          AppButton(label: 'Save', onPressed: () => Navigator.pop(context, true)),
        ],
      ),
    );
  }
}
