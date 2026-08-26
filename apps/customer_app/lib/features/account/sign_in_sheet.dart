import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show AuthException;

import '../../design/tokens.dart';
import '../../data/auth_repository.dart';

Future<void> showSignInSheet(BuildContext context) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _SignInSheet(),
    );

/// Sign in, by email or by mobile number.
///
/// Mobile + OTP sits alongside email rather than beneath it: a phone number is
/// the identifier most Philippine tenants actually have and remember, and
/// burying it would make the app harder to use for the people it is for.
class _SignInSheet extends ConsumerStatefulWidget {
  const _SignInSheet();

  @override
  ConsumerState<_SignInSheet> createState() => _SignInSheetState();
}

enum _Method { email, mobile }

class _SignInSheetState extends ConsumerState<_SignInSheet> {
  _Method _method = _Method.email;
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _mobile = TextEditingController();
  final _code = TextEditingController();

  bool _busy = false;
  bool _codeSent = false;
  bool _registering = false;
  String? _error;
  String? _notice;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _mobile.dispose();
    _code.dispose();
    super.dispose();
  }

  /// Runs an auth call, turning provider failures into something a person can
  /// act on rather than a raw exception.
  Future<void> _run(Future<void> Function() action, {String? notice}) async {
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });

    try {
      await action();
      if (!mounted) return;
      setState(() => _notice = notice);
      if (notice == null && mounted) Navigator.of(context).pop();
    } on AuthException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not reach the server. Try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = ref.read(authRepositoryProvider);

    return Padding(
      padding: EdgeInsets.only(
        left: Tokens.gutter,
        right: Tokens.gutter,
        top: Tokens.s20,
        bottom: MediaQuery.of(context).viewInsets.bottom + Tokens.s20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _registering ? 'Create your account' : 'Sign in',
              style: theme.textTheme.headlineSmall,
            ),
            const SizedBox(height: Tokens.s8),
            Text(
              // D-15, said before it can be got wrong.
              'One account for everything — browsing, renting, and paying.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: Tokens.s20),
            SegmentedButton<_Method>(
              segments: const [
                ButtonSegment(value: _Method.email, label: Text('Email')),
                ButtonSegment(value: _Method.mobile, label: Text('Mobile')),
              ],
              selected: {_method},
              onSelectionChanged: (next) => setState(() {
                _method = next.first;
                _error = null;
                _notice = null;
              }),
            ),
            const SizedBox(height: Tokens.s20),
            if (_method == _Method.email) ...[
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              const SizedBox(height: Tokens.s12),
              TextField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password'),
              ),
            ] else ...[
              TextField(
                controller: _mobile,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Mobile number',
                  hintText: '+63 917 123 4567',
                ),
              ),
              if (_codeSent) ...[
                const SizedBox(height: Tokens.s12),
                TextField(
                  controller: _code,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Code'),
                ),
              ],
            ],
            if (_error != null) ...[
              const SizedBox(height: Tokens.s12),
              Text(
                _error!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ],
            if (_notice != null) ...[
              const SizedBox(height: Tokens.s12),
              Text(_notice!, style: theme.textTheme.bodySmall),
            ],
            const SizedBox(height: Tokens.s20),
            FilledButton(
              onPressed: _busy ? null : () => _submit(auth),
              child: _busy
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(_primaryLabel()),
            ),
            if (_method == _Method.email) ...[
              const SizedBox(height: Tokens.s8),
              TextButton(
                onPressed: _busy
                    ? null
                    : () => setState(() {
                          _registering = !_registering;
                          _error = null;
                          _notice = null;
                        }),
                child: Text(
                  _registering
                      ? 'I already have an account'
                      : 'Create an account',
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _primaryLabel() {
    if (_method == _Method.mobile) {
      return _codeSent ? 'Verify code' : 'Send code';
    }
    return _registering ? 'Create account' : 'Sign in';
  }

  Future<void> _submit(AuthGateway auth) {
    if (_method == _Method.mobile) {
      if (!_codeSent) {
        return _run(
          () async {
            await auth.sendMobileOtp(_mobile.text.trim());
            if (mounted) setState(() => _codeSent = true);
          },
          notice: 'We sent you a code.',
        );
      }
      return _run(() => auth.verifyMobileOtp(
            mobile: _mobile.text.trim(),
            code: _code.text.trim(),
          ));
    }

    if (_registering) {
      return _run(
        () => auth.signUpWithPassword(
          email: _email.text.trim(),
          password: _password.text,
        ),
        notice: 'Check your email to confirm your account.',
      );
    }

    return _run(() => auth.signInWithPassword(
          email: _email.text.trim(),
          password: _password.text,
        ));
  }
}
