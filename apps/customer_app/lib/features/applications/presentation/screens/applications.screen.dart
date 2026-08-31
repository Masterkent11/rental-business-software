import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/design/app_image.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/domain/value_objects/money.value_object.dart';
import '../../domain/entities/rental_application.entity.dart';
import '../../domain/value_objects/application_status.value_object.dart';
import '../controllers/applications.controller.dart';
import '../widgets/empty_applications.widget.dart';

class ApplicationsScreen extends ConsumerWidget {
  const ApplicationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appsAsync = ref.watch(myApplicationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Applications')),
      body: appsAsync.when(
        data: (apps) {
          if (apps.isEmpty) return const EmptyApplications();

          return ListView.separated(
            padding: const EdgeInsets.all(Tokens.gutter),
            itemCount: apps.length,
            separatorBuilder: (_, __) => const SizedBox(height: Tokens.s16),
            itemBuilder: (context, index) => _ApplicationCard(application: apps[index]),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }
}

class _ApplicationCard extends StatelessWidget {
  const _ApplicationCard({required this.application});
  final RentalApplication application;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFmt = DateFormat('MMM d, yyyy');

    final (statusColor, statusBg) = switch (application.status) {
      ApplicationStatus.approved => (Tokens.accent, Tokens.accentSoft),
      ApplicationStatus.underReview => (Tokens.ink, Tokens.surfaceMuted),
      ApplicationStatus.rejected => (Tokens.danger, const Color(0xFFFEE2E2)),
      ApplicationStatus.submitted => (Tokens.inkMuted, Tokens.surfaceMuted),
      ApplicationStatus.withdrawn => (Tokens.inkMuted, Tokens.surfaceMuted),
      ApplicationStatus.expired => (Tokens.inkMuted, Tokens.surfaceMuted),
    };

    return Container(
      decoration: BoxDecoration(
        color: Tokens.surface,
        borderRadius: Tokens.borderLg,
        border: Border.all(color: Tokens.line),
        boxShadow: Tokens.shadowSm,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (application.photo.isNotEmpty)
                AppImage(url: application.photo, width: 100, height: 100)
              else
                Container(width: 100, height: 100, color: Tokens.surfaceSubtle),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(Tokens.s12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Ref: ${application.reference.isNotEmpty ? application.reference : application.id.substring(0, 8)}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11, color: Tokens.inkMuted, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: statusBg,
                              borderRadius: Tokens.borderXs,
                            ),
                            child: Text(
                              application.status.label,
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: Tokens.s4),
                      Text(
                        application.listingTitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: Tokens.s4),
                      Text(
                        '${Money.formatPesos(application.monthlyCentavos)} / mo',
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(Tokens.s12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text('Desired move-in:', style: theme.textTheme.bodySmall?.copyWith(color: Tokens.inkMuted)),
                    ),
                    Text(dateFmt.format(application.moveIn), style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                  ],
                ),
                if (application.status == ApplicationStatus.approved && application.holdExpiresAt != null) ...[
                  const SizedBox(height: Tokens.s8),
                  Container(
                    padding: const EdgeInsets.all(Tokens.s8),
                    decoration: const BoxDecoration(
                      color: Tokens.accentSoft,
                      borderRadius: Tokens.borderSm,
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.timer_outlined, size: 16, color: Tokens.accent),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Hold expires: ${dateFmt.format(application.holdExpiresAt!)}',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Tokens.accent),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if (application.reason != null && application.reason!.isNotEmpty) ...[
                  const SizedBox(height: Tokens.s8),
                  Text(
                    'Decision Note: ${application.reason}',
                    style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Tokens.danger),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
