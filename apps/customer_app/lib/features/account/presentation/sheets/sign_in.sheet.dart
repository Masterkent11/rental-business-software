import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/composition_root.dart';
import '../../../../core/design/tokens.dart';

Future<void> showSignInSheet(BuildContext context) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const SignInSheet(),
    );

class SignInSheet extends ConsumerStatefulWidget {
  const SignInSheet({super.key});

  @override
  ConsumerState<SignInSheet> createState() => _SignInSheetState();
}

enum _Method { email, mobile }

class _SignInSheetState extends ConsumerState<SignInSheet> {
  _Method _method = _Method.email;
  bool _isSignUp = false;
  bool _loading = false;
  bool _otpSent = false;
  String? _error;

  final _email = TextEditingController();
  final _password = TextEditingController();
  final _mobile = TextEditingController(text: '+63 ');
  final _code = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _mobile.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      if (_method == _Method.email) {
        if (_isSignUp) {
          await ref.read(signUpUseCaseProvider).call(
                email: _email.text.trim(),
                password: _password.text,
              );
          if (mounted) Navigator.of(context).pop();
        } else {
          await ref.read(signInUseCaseProvider).call(
                email: _email.text.trim(),
                password: _password.text,
              );
          if (mounted) Navigator.of(context).pop();
        }
      } else {
        if (!_otpSent) {
          await ref
              .read(sendMobileOtpUseCaseProvider)
              .call(_mobile.text.trim());
          if (mounted) setState(() => _otpSent = true);
        } else {
          await ref.read(verifyMobileOtpUseCaseProvider).call(
                mobile: _mobile.text.trim(),
                code: _code.text.trim(),
              );
          if (mounted) Navigator.of(context).pop();
        }
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final media = MediaQuery.of(context);

    return Padding(
      padding: EdgeInsets.only(
        left: Tokens.gutter,
        right: Tokens.gutter,
        top: Tokens.s20,
        bottom: media.viewInsets.bottom + Tokens.gutter,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _isSignUp ? 'Create an account' : 'Sign in',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.4,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: Tokens.s16),
          SegmentedButton<_Method>(
            segments: const [
              ButtonSegment(value: _Method.email, label: Text('Email')),
              ButtonSegment(value: _Method.mobile, label: Text('Mobile')),
            ],
            selected: {_method},
            onSelectionChanged: (s) => setState(() {
              _method = s.first;
              _error = null;
              _otpSent = false;
            }),
          ),
          const SizedBox(height: Tokens.s16),
          if (_method == _Method.email) ...[
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              decoration: const InputDecoration(labelText: 'Email address'),
            ),
            const SizedBox(height: Tokens.s12),
            TextField(
              controller: _password,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password'),
            ),
          ] else ...[
            if (!_otpSent)
              TextField(
                controller: _mobile,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Philippine mobile number',
                  hintText: '+63 9XX XXX XXXX',
                ),
              )
            else
              TextField(
                controller: _code,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: '6-digit code',
                  hintText: '123456',
                ),
              ),
          ],
          if (_error != null) ...[
            const SizedBox(height: Tokens.s12),
            Text(
              _error!,
              style: theme.textTheme.bodySmall?.copyWith(color: Tokens.danger),
            ),
          ],
          const SizedBox(height: Tokens.s20),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Tokens.surface),
                  )
                : Text(
                    _method == _Method.mobile && !_otpSent
                        ? 'Send code'
                        : _isSignUp
                            ? 'Create account'
                            : 'Sign in',
                  ),
          ),
          if (_method == _Method.email) ...[
            const SizedBox(height: Tokens.s8),
            TextButton(
              onPressed: () => setState(() => _isSignUp = !_isSignUp),
              child: Text(
                _isSignUp
                    ? 'Already have an account? Sign in'
                    : 'Need an account? Sign up',
              ),
            ),
          ],
        ],
      ),
    );
  }
}
