import 'package:flutter/material.dart';
import 'application_styles.dart';

class VerificationProcessingSheet extends StatelessWidget {
  const VerificationProcessingSheet({this.textExtracted = false, super.key});
  final bool textExtracted;
  @override
  Widget build(BuildContext context) => Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(28, 24, 28, 24),
      decoration:
          const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
      child: SafeArea(
          top: false,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            LinearProgressIndicator(
                minHeight: 12,
                color: ApplicationStyles.blue,
                backgroundColor: ApplicationStyles.pale,
                borderRadius: BorderRadius.circular(12),
                semanticsLabel: 'Processing the captured ID'),
            const SizedBox(height: 20),
            for (var i = 0; i < 3; i++)
              Padding(
                  padding: const EdgeInsets.only(bottom: 18),
                  child: Row(children: [
                    Icon(Icons.check_circle,
                        size: 26, color: textExtracted && i < 2 ? ApplicationStyles.blue : ApplicationStyles.border),
                    const SizedBox(width: 16),
                    Expanded(
                        child: Text(['Reading ID information…', 'Extracting text…', 'Verifying details…'][i],
                            style: ApplicationStyles.helper.copyWith(fontSize: 14))),
                  ])),
          ])));
}
