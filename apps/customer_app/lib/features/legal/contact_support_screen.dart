import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/api_client.dart';
import '../../data/auth_repository.dart';
import '../../data/content_repository.dart';
import '../../data/ids.dart';
import '../../design/components.dart';
import '../../design/controls.dart';
import '../../design/tokens.dart';
import '../../design/typography.dart';

class ContactSupportScreen extends ConsumerStatefulWidget {
  const ContactSupportScreen({this.initialTopic, this.listingId, super.key});

  final String? initialTopic;
  final String? listingId;

  @override
  ConsumerState<ContactSupportScreen> createState() => _ContactSupportScreenState();
}

class _ContactSupportScreenState extends ConsumerState<ContactSupportScreen> {
  late final TextEditingController _email;
  final _message = TextEditingController();
  late SupportTopic _topic;
  final String _clientRef = newUuid();
  bool _sending = false;
  bool _sent = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _topic = SupportTopic.fromApi(widget.initialTopic);
    _email = TextEditingController(text: ref.read(authRepositoryProvider).email ?? '');
  }

  @override
  void dispose() {
    _email.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    final message = _message.text.trim();
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      setState(() => _error = 'Enter an email address so we can reply.');
      return;
    }
    if (message.length < 10) {
      setState(() => _error = 'Tell us a little more — at least 10 characters.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(contentRepositoryProvider).contactSupport(
            email: email,
            topic: _topic,
            message: message,
            clientRef: _clientRef,
            listingId: widget.listingId,
          );
      if (mounted) setState(() => _sent = true);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Contact support')),
      body: _sent
          ? EmptyState(
              icon: Icons.mark_email_read_outlined,
              title: 'Message received',
              message: 'Our team will reply to ${_email.text.trim()}.',
              actionLabel: 'Done',
              onAction: () => Navigator.of(context).maybePop(),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s40),
              children: [
                const Text('What do you need help with?', style: AppText.sectionTitle),
                const SizedBox(height: Tokens.s8),
                Wrap(
                  spacing: Tokens.s6,
                  children: [
                    for (final topic in SupportTopic.values)
                      AppFilterChip(
                          label: topic.label, selected: topic == _topic, onTap: () => setState(() => _topic = topic)),
                  ],
                ),
                const SizedBox(height: Tokens.s16),
                AppTextField(
                  label: 'Your email',
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                ),
                const SizedBox(height: Tokens.s16),
                AppTextField(
                  label: 'Message',
                  controller: _message,
                  hint: _topic == SupportTopic.listingReport
                      ? 'Which listing, and what looks wrong?'
                      : 'Tell us what happened and how we can help.',
                  maxLines: 6,
                  textCapitalization: TextCapitalization.sentences,
                ),
                if (_error != null) ...[
                  const SizedBox(height: Tokens.s12),
                  Text(_error!, style: AppText.caption.copyWith(color: Tokens.taken)),
                ],
                const SizedBox(height: Tokens.s24),
                AppButton(label: 'Send message', busy: _sending, onPressed: _submit),
              ],
            ),
    );
  }
}
