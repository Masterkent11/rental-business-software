import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/ids.dart';
import '../../data/messaging_repository.dart';
import '../../data/tenant_home_repository.dart';
import 'domain/tenant_home.dart';
import 'widgets/home_cards.dart';

void messageLandlord(BuildContext context, TenantHome home) {
  final listingId = home.listingId;
  if (listingId == null) {
    context.push(Routes.contactSupport(topic: 'tenancy'));
  } else {
    context.push(Routes.startConversation(listingId: listingId, bookingId: home.id));
  }
}

Future<void> homeSheet(BuildContext context, String title, Widget child) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      builder: (context) => DraggableScrollableSheet(
          initialChildSize: .65,
          minChildSize: .3,
          maxChildSize: .9,
          expand: false,
          builder: (context, controller) =>
              ListView(controller: controller, padding: const EdgeInsets.all(24), children: [
                Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: homeNavy)),
                const SizedBox(height: 20),
                child,
              ])),
    );

void showInvoices(BuildContext context, TenantHome home) => homeSheet(
    context,
    'Payments & Invoices',
    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (home.invoices.isEmpty) const Text('No invoices have been issued for this tenancy.'),
      for (final invoice in home.invoices)
        Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: HomeCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Invoice #${invoice.number}', style: const TextStyle(fontWeight: FontWeight.w700, color: homeNavy)),
              const SizedBox(height: 8),
              Text(invoice.state.replaceAll('_', ' ')),
              Text('Total: ${peso(invoice.total)}'),
              Text('Paid: ${peso(invoice.paid)}'),
              Text('Outstanding: ${peso(invoice.outstanding)}'),
              for (final line in invoice.lines)
                Padding(
                    padding: const EdgeInsets.only(top: 6), child: Text('${line.description}  ${peso(line.amount)}')),
              if (invoice.outstanding > 0) ...[
                const SizedBox(height: 12),
                const Text(
                    'Online rent payment is not available. Contact your property manager for payment instructions.')
              ],
            ]))),
      const SizedBox(height: 12),
      OutlinedButton(
          onPressed: () {
            Navigator.pop(context);
            messageLandlord(context, home);
          },
          child: const Text('Contact property manager')),
    ]));

void showLeaseDocuments(BuildContext context, TenantHome home) => homeSheet(
    context,
    'Lease Documents',
    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Icon(Icons.description_outlined, size: 40, color: homeNavy),
      const SizedBox(height: 16),
      const Text(
          'No lease documents are available in the app. Ask your property manager for your lease and related files.'),
      const SizedBox(height: 20),
      OutlinedButton(
          onPressed: () {
            Navigator.pop(context);
            messageLandlord(context, home);
          },
          child: const Text('Request documents')),
    ]));

class MaintenanceRequest extends ConsumerStatefulWidget {
  const MaintenanceRequest({required this.home, super.key});
  final TenantHome home;
  @override
  ConsumerState<MaintenanceRequest> createState() => _MaintenanceRequestState();
}

class _MaintenanceRequestState extends ConsumerState<MaintenanceRequest> {
  final _body = TextEditingController();
  final _clientId = newUuid();
  bool _busy = false;
  String? _error;
  @override
  void dispose() {
    _body.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_busy) return;
    if (_body.text.trim().length < 10) {
      setState(() => _error = 'Describe the issue in at least 10 characters.');
      return;
    }
    final id = widget.home.listingId;
    if (id == null) {
      context.push(Routes.contactSupport(topic: 'maintenance'));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final conversationId =
          await ref.read(tenantHomeRepositoryProvider).requestMaintenance(widget.home.id, _body.text.trim(), _clientId);
      ref.read(inboxProvider.notifier).refreshQuietly();
      if (mounted) {
        Navigator.pop(context);
        context.push(Routes.conversation(conversationId));
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error is ApiException ? error.message : 'Could not send your request. Please retry.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.viewInsetsOf(context).bottom + 24),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Maintenance', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: homeNavy)),
        const SizedBox(height: 10),
        const Text('Send a repair request directly to your property manager.'),
        const SizedBox(height: 16),
        TextField(
            controller: _body,
            minLines: 3,
            maxLines: 6,
            maxLength: 1500,
            enabled: !_busy,
            decoration: InputDecoration(labelText: 'Describe the issue', errorText: _error)),
        const SizedBox(height: 16),
        SizedBox(
            width: double.infinity,
            child: FilledButton(onPressed: _busy ? null : _send, child: Text(_busy ? 'Sending…' : 'Send request'))),
      ]));
}
