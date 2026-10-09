import 'package:flutter/material.dart';

import '../../design/tokens.dart';

class AppBootstrapErrorView extends StatelessWidget {
  const AppBootstrapErrorView({
    this.error,
    this.onRetry,
    super.key,
  });

  final Object? error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final errorMessage = error != null ? error.toString() : 'An unexpected error occurred during startup.';

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: Tokens.s32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.cloud_off_rounded,
                size: 56,
                color: theme.colorScheme.error,
              ),
              const SizedBox(height: Tokens.s20),
              Text(
                'Initialization Failed',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: Tokens.s8),
              Text(
                errorMessage,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: Tokens.s24),
              if (onRetry != null)
                FilledButton.icon(
                  key: const ValueKey('bootstrap_retry_button'),
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Retry'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
