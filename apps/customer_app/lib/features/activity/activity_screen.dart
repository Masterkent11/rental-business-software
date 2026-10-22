import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/auth_repository.dart';
import '../../data/marketplace_repository.dart';
import '../../data/viewing_repository.dart';
import '../../design/app_image.dart';
import '../../design/tokens.dart';

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  String? _busyId;

  Future<void> _cancel(ViewingView viewing) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel this viewing?'),
        content: Text('${viewing.listingTitle} will be notified.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Keep it')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Cancel viewing')),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _busyId = viewing.id);
    try {
      await ref.read(viewingRepositoryProvider).cancel(viewing.id);
      ref.invalidate(myViewingsProvider);
    } on ApiException catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!ref.watch(isSignedInProvider)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Inquiries & viewings')),
        body: Center(
          child: FilledButton(
            onPressed: () =>
                context.push(Routes.auth(from: Routes.activity, reason: 'Sign in to see your inquiries and viewings.')),
            child: const Text('Sign in'),
          ),
        ),
      );
    }
    final inquiries = ref.watch(myInquiriesProvider);
    final viewings = ref.watch(myViewingsProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: Tokens.canvas,
        appBar: AppBar(
          backgroundColor: Tokens.canvas,
          title: const Text('Inquiries & viewings'),
          bottom: const TabBar(
            labelColor: Tokens.primaryNavy,
            indicatorColor: Tokens.primaryNavy,
            tabs: [Tab(text: 'Viewings'), Tab(text: 'Inquiries')],
          ),
        ),
        body: TabBarView(
          children: [
            RefreshIndicator(
              onRefresh: () => ref.refresh(myViewingsProvider.future),
              child: switch (viewings) {
                AsyncError(:final error) => _Failed(error: error, onRetry: () => ref.invalidate(myViewingsProvider)),
                AsyncData(:final value) when value.isEmpty => const _Empty(
                    icon: Icons.event_available_outlined,
                    title: 'No viewings yet',
                    message: 'Request a viewing from any property for sale.',
                  ),
                AsyncData(:final value) => ListView.separated(
                    padding: const EdgeInsets.all(Tokens.gutter),
                    itemCount: value.length,
                    separatorBuilder: (_, __) => const SizedBox(height: Tokens.s12),
                    itemBuilder: (context, i) => _ViewingTile(
                      viewing: value[i],
                      busy: _busyId == value[i].id,
                      onCancel: () => _cancel(value[i]),
                      onReschedule: () =>
                          context.push('${Routes.viewing(value[i].listingId)}?reschedule=${value[i].id}'),
                      onMessage: () => context.push(Routes.conversation(value[i].conversationId)),
                      onOpen: () => context.push(Routes.viewingRequest(value[i].listingId, value[i].id)),
                    ),
                  ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
            RefreshIndicator(
              onRefresh: () => ref.refresh(myInquiriesProvider.future),
              child: switch (inquiries) {
                AsyncError(:final error) => _Failed(error: error, onRetry: () => ref.invalidate(myInquiriesProvider)),
                AsyncData(:final value) when value.isEmpty => const _Empty(
                    icon: Icons.mark_email_unread_outlined,
                    title: 'No inquiries yet',
                    message: 'Questions you send about a property appear here.',
                  ),
                AsyncData(:final value) => ListView.separated(
                    padding: const EdgeInsets.all(Tokens.gutter),
                    itemCount: value.length,
                    separatorBuilder: (_, __) => const SizedBox(height: Tokens.s12),
                    itemBuilder: (context, i) => _InquiryTile(
                      inquiry: value[i],
                      onTap: () => context.push(Routes.conversation(value[i].conversationId)),
                    ),
                  ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(Tokens.rSm),
        child: SizedBox(
            width: 60,
            height: 60,
            child: AppImage(url: url ?? '', fallbackIcon: Icons.home_work_outlined, cacheWidth: 120)),
      );
}

class _ViewingTile extends StatelessWidget {
  const _ViewingTile({
    required this.viewing,
    required this.busy,
    required this.onCancel,
    required this.onReschedule,
    required this.onMessage,
    required this.onOpen,
  });

  final ViewingView viewing;
  final bool busy;
  final VoidCallback onCancel;
  final VoidCallback onReschedule;
  final VoidCallback onMessage;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final scheduled = viewing.scheduledAt;
    final when = scheduled != null
        ? DateFormat("EEE, MMM d · h:mm a").format(manilaWallClock(scheduled))
        : viewing.preferredLabel;
    final color = switch (viewing.status) {
      ViewingStatus.confirmed => Tokens.available,
      ViewingStatus.cancelled || ViewingStatus.declined => Tokens.taken,
      _ => Tokens.primaryNavy,
    };
    return GestureDetector(
      onTap: onOpen,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.all(Tokens.s12),
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(Tokens.rMd),
            border: Border.all(color: Tokens.hairline)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _Thumb(url: viewing.listingPhoto),
                const SizedBox(width: Tokens.s12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(viewing.listingTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Tokens.primaryNavy)),
                      Text(when, style: const TextStyle(fontSize: 13)),
                      Text(viewing.statusLabel,
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: color)),
                    ],
                  ),
                ),
              ],
            ),
            if (viewing.partnerNote.isNotEmpty) ...[
              const SizedBox(height: Tokens.s8),
              Text('${viewing.partnerName}: ${viewing.partnerNote}',
                  style: const TextStyle(fontSize: 12.5, color: Tokens.muted)),
            ],
            const SizedBox(height: Tokens.s8),
            Wrap(
              spacing: Tokens.s8,
              children: [
                TextButton(onPressed: onOpen, child: const Text('Details')),
                TextButton(onPressed: onMessage, child: const Text('Message')),
                if (viewing.isActive)
                  TextButton(onPressed: busy ? null : onReschedule, child: const Text('Change time')),
                if (viewing.isActive)
                  TextButton(
                    onPressed: busy ? null : onCancel,
                    style: TextButton.styleFrom(foregroundColor: Tokens.taken),
                    child: busy
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Cancel'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _InquiryTile extends StatelessWidget {
  const _InquiryTile({required this.inquiry, required this.onTap});

  final InquiryView inquiry;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(Tokens.rMd),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(Tokens.rMd),
        child: Container(
          padding: const EdgeInsets.all(Tokens.s12),
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(Tokens.rMd), border: Border.all(color: Tokens.hairline)),
          child: Row(
            children: [
              _Thumb(url: inquiry.listingPhoto),
              const SizedBox(width: Tokens.s12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(inquiry.listingTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, color: Tokens.primaryNavy)),
                    Text('${inquiry.partnerName} · ${DateFormat('MMM d').format(inquiry.createdAt)}',
                        style: const TextStyle(fontSize: 12.5, color: Tokens.muted)),
                    Text(inquiry.progressLabel,
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Tokens.primaryNavy)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Tokens.muted),
            ],
          ),
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.icon, required this.title, required this.message});

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(Tokens.s40),
      children: [
        Icon(icon, size: 40, color: Tokens.muted),
        const SizedBox(height: Tokens.s12),
        Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Tokens.muted)),
      ],
    );
  }
}

class _Failed extends StatelessWidget {
  const _Failed({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(Tokens.s40),
      children: [
        const Icon(Icons.cloud_off_outlined, size: 40, color: Tokens.muted),
        const SizedBox(height: Tokens.s12),
        Text(error is ApiException ? (error as ApiException).message : 'Something went wrong.',
            textAlign: TextAlign.center),
        const SizedBox(height: Tokens.s16),
        Center(child: FilledButton(onPressed: onRetry, child: const Text('Try again'))),
      ],
    );
  }
}
