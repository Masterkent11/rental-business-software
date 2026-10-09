import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/auth_repository.dart';
import '../../data/content_repository.dart';
import '../../design/components.dart';
import '../../design/tokens.dart';
import '../../design/typography.dart';

enum AuthMode { signIn, signUp, reset }

final _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({this.from, this.reason, this.initialMode = AuthMode.signIn, super.key});

  final String? from;
  final String? reason;
  final AuthMode initialMode;

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  late AuthMode _mode = widget.initialMode;
  final _name = TextEditingController();
  final _emailField = TextEditingController();
  final _password = TextEditingController();
  final _nameFocus = FocusNode();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();

  bool _busy = false;
  bool _acceptedPolicies = false;
  String? _error;
  String? _notice;
  Map<String, String> _fieldErrors = const {};

  @override
  void dispose() {
    _name.dispose();
    _emailField.dispose();
    _password.dispose();
    _nameFocus.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  void _switch(AuthMode mode) {
    setState(() {
      _mode = mode;
      _error = null;
      _notice = null;
      _fieldErrors = const {};
    });
  }

  Map<String, String> _validate() {
    final errors = <String, String>{};
    final email = _emailField.text.trim();
    if (!_email.hasMatch(email)) errors['email'] = 'Enter a valid email address';
    if (_mode != AuthMode.reset) {
      if (_password.text.length < (_mode == AuthMode.signUp ? 8 : 6)) {
        errors['password'] = _mode == AuthMode.signUp ? 'Use at least 8 characters' : 'Enter your password';
      }
    }
    if (_mode == AuthMode.signUp && _name.text.trim().length < 2) {
      errors['name'] = 'Tell us your name';
    }
    if (_mode == AuthMode.signUp && !_acceptedPolicies) {
      errors['terms'] = 'Please accept the Terms & Conditions and Privacy Policy';
    }
    return errors;
  }

  Future<void> _recordPendingConsent() async {
    try {
      await ref.read(consentRecorderProvider).flushPending();
    } on ApiException {
      return;
    }
  }

  void _finish() {
    if (!mounted) return;
    final from = widget.from;
    if (from != null && from.isNotEmpty) {
      context.pushReplacement(from);
    } else if (context.canPop()) {
      context.pop();
    } else {
      context.go('/discover');
    }
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final errors = _validate();
    setState(() {
      _fieldErrors = errors;
      _error = null;
      _notice = null;
    });
    if (errors.isNotEmpty) return;

    setState(() => _busy = true);
    final auth = ref.read(authRepositoryProvider);
    try {
      switch (_mode) {
        case AuthMode.signIn:
          await auth.signInWithPassword(email: _emailField.text.trim(), password: _password.text);
          await _recordPendingConsent();
          _finish();
        case AuthMode.signUp:
          final consent = ref.read(consentRecorderProvider);
          final List<PolicyReference> policies;
          try {
            policies = await consent.currentSignUpPolicies();
          } on ApiException {
            if (mounted) {
              setState(() => _error = 'We couldn’t load the Terms right now. Check your connection and try again.');
            }
            return;
          }
          final outcome = await auth.signUpWithPassword(
            email: _emailField.text.trim(),
            password: _password.text,
            fullName: _name.text.trim(),
          );
          await consent.rememberPending(policies);
          if (outcome == SignUpOutcome.signedIn) {
            await _recordPendingConsent();
            _finish();
          } else if (mounted) {
            setState(() {
              _mode = AuthMode.signIn;
              _notice = 'Check ${_emailField.text.trim()} for a link to confirm your account, then sign in.';
            });
          }
        case AuthMode.reset:
          await auth.sendPasswordReset(_emailField.text.trim());
          if (mounted) {
            setState(() => _notice = 'If an account exists for that email, a reset link is on its way.');
          }
      }
    } on AuthFailure catch (failure) {
      if (mounted) setState(() => _error = failure.message);
    } catch (error) {
      if (mounted) setState(() => _error = friendlyAuthMessage(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = switch (_mode) {
      AuthMode.signIn => 'Welcome back',
      AuthMode.signUp => 'Create your account',
      AuthMode.reset => 'Reset your password',
    };
    final subtitle = switch (_mode) {
      AuthMode.signIn => widget.reason ?? 'Sign in to book, message owners and keep your saved places.',
      AuthMode.signUp => widget.reason ?? 'One account for browsing, booking and messaging.',
      AuthMode.reset => 'Enter the email you signed up with and we’ll send you a link.',
    };

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Close',
          icon: const Icon(Icons.close),
          onPressed: () => context.canPop() ? context.pop() : context.go('/discover'),
        ),
      ),
      body: SafeArea(
        top: false,
        child: AutofillGroup(
          child: ListView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: EdgeInsets.fromLTRB(
              Tokens.gutter + 4,
              Tokens.s8,
              Tokens.gutter + 4,
              Tokens.s32 + MediaQuery.viewInsetsOf(context).bottom,
            ),
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Image.asset('assets/brand/mark.png', width: 52, height: 52, semanticLabel: 'Westayplace'),
                ),
              ),
              const SizedBox(height: Tokens.s24),
              Text(title, style: theme.textTheme.headlineMedium),
              const SizedBox(height: Tokens.s8),
              Text(
                subtitle,
                style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: Tokens.s32),
              if (_mode == AuthMode.signUp) ...[
                AppTextField(
                  key: const ValueKey('auth-name'),
                  label: 'Full name',
                  controller: _name,
                  focusNode: _nameFocus,
                  hint: 'Juan dela Cruz',
                  error: _fieldErrors['name'],
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.name],
                  onSubmitted: (_) => _emailFocus.requestFocus(),
                ),
                const SizedBox(height: Tokens.s20),
              ],
              AppTextField(
                key: const ValueKey('auth-email'),
                label: 'Email',
                controller: _emailField,
                focusNode: _emailFocus,
                hint: 'you@example.com',
                error: _fieldErrors['email'],
                keyboardType: TextInputType.emailAddress,
                textInputAction: _mode == AuthMode.reset ? TextInputAction.done : TextInputAction.next,
                autofillHints: const [AutofillHints.email, AutofillHints.username],
                onSubmitted: (_) => _mode == AuthMode.reset ? _submit() : _passwordFocus.requestFocus(),
              ),
              if (_mode != AuthMode.reset) ...[
                const SizedBox(height: Tokens.s20),
                AppTextField(
                  key: const ValueKey('auth-password'),
                  label: 'Password',
                  controller: _password,
                  focusNode: _passwordFocus,
                  password: true,
                  hint: _mode == AuthMode.signUp ? 'At least 8 characters' : 'Your password',
                  error: _fieldErrors['password'],
                  textInputAction: TextInputAction.done,
                  autofillHints:
                      _mode == AuthMode.signUp ? const [AutofillHints.newPassword] : const [AutofillHints.password],
                  onSubmitted: (_) => _submit(),
                ),
              ],
              if (_mode == AuthMode.signUp)
                _PolicyConsent(
                  accepted: _acceptedPolicies,
                  error: _fieldErrors['terms'],
                  onChanged: (value) => setState(() {
                    _acceptedPolicies = value;
                    _fieldErrors = {..._fieldErrors}..remove('terms');
                  }),
                ),
              if (_mode == AuthMode.signIn)
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: _busy ? null : () => _switch(AuthMode.reset),
                    child: const Text('Forgot password?'),
                  ),
                )
              else
                const SizedBox(height: Tokens.s20),
              if (_error != null) ...[
                _Banner(message: _error!, error: true),
                const SizedBox(height: Tokens.s16),
              ],
              if (_notice != null) ...[
                _Banner(message: _notice!, error: false),
                const SizedBox(height: Tokens.s16),
              ],
              AppButton(
                key: const ValueKey('auth-submit'),
                label: switch (_mode) {
                  AuthMode.signIn => 'Sign in',
                  AuthMode.signUp => 'Create account',
                  AuthMode.reset => 'Send reset link',
                },
                busy: _busy,
                onPressed: _submit,
              ),
              const SizedBox(height: Tokens.s24),
              Center(
                child: switch (_mode) {
                  AuthMode.signIn => _SwitchLink(
                      prompt: 'New here?',
                      action: 'Create an account',
                      onTap: _busy ? null : () => _switch(AuthMode.signUp),
                    ),
                  AuthMode.signUp => _SwitchLink(
                      prompt: 'Already have an account?',
                      action: 'Sign in',
                      onTap: _busy ? null : () => _switch(AuthMode.signIn),
                    ),
                  AuthMode.reset => _SwitchLink(
                      prompt: 'Remembered it?',
                      action: 'Back to sign in',
                      onTap: _busy ? null : () => _switch(AuthMode.signIn),
                    ),
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SwitchLink extends StatelessWidget {
  const _SwitchLink({required this.prompt, required this.action, required this.onTap});

  final String prompt;
  final String action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text('$prompt ', style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        TextButton(
          onPressed: onTap,
          style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
          child: Text(action, style: theme.textTheme.labelLarge?.copyWith(color: Tokens.accent)),
        ),
      ],
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.message, required this.error});

  final String message;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final color = error ? Tokens.taken : Tokens.available;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(Tokens.s12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(Tokens.rSm),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(error ? Icons.error_outline : Icons.mark_email_read_outlined, size: 18, color: color),
            const SizedBox(width: Tokens.s8),
            Expanded(
              child: Text(message, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: color)),
            ),
          ],
        ),
      ),
    );
  }
}

class _PolicyConsent extends StatelessWidget {
  const _PolicyConsent({required this.accepted, required this.onChanged, this.error});

  final bool accepted;
  final ValueChanged<bool> onChanged;
  final String? error;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: Tokens.s12, bottom: Tokens.s8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: Tokens.tap,
                height: Tokens.tap,
                child: Checkbox(
                  value: accepted,
                  onChanged: (value) => onChanged(value ?? false),
                  activeColor: Tokens.primaryNavy,
                  semanticLabel: 'I agree to the Terms and Conditions and Privacy Policy',
                ),
              ),
              const Expanded(
                child: Padding(
                  padding: EdgeInsets.only(top: Tokens.s12),
                  child: Wrap(
                    children: [
                      Text('I agree to the ', style: AppText.supporting),
                      _PolicyLink(label: 'Terms & Conditions', slug: 'terms'),
                      Text(' and ', style: AppText.supporting),
                      _PolicyLink(label: 'Privacy Policy', slug: 'privacy'),
                    ],
                  ),
                ),
              ),
            ],
          ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(left: Tokens.tap),
              child: Text(error!, style: AppText.caption.copyWith(color: Tokens.taken)),
            ),
        ],
      ),
    );
  }
}

class _PolicyLink extends StatelessWidget {
  const _PolicyLink({required this.label, required this.slug});

  final String label;
  final String slug;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      link: true,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: () => context.push(Routes.legal(slug)),
        child: Text(
          label,
          style: AppText.supporting.copyWith(
            color: Tokens.primaryNavy,
            fontWeight: FontWeight.w600,
            decoration: TextDecoration.underline,
          ),
        ),
      ),
    );
  }
}
