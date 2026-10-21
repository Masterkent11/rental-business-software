import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'application_styles.dart';
import 'domain/verification.dart';

class IdentityReviewForm extends StatefulWidget {
  const IdentityReviewForm(
      {required this.session,
      required this.busy,
      required this.onConfirm,
      required this.onRecapture,
      this.onBack,
      this.preview,
      this.error,
      super.key});
  final VerificationSession session;
  final bool busy;
  final ValueChanged<IdentityDetails> onConfirm;
  final VoidCallback onRecapture;
  final VoidCallback? onBack;
  final Uint8List? preview;
  final String? error;
  @override
  State<IdentityReviewForm> createState() => _IdentityReviewFormState();
}

class _IdentityReviewFormState extends State<IdentityReviewForm> {
  final _form = GlobalKey<FormState>();
  late final List<TextEditingController> _fields;
  static const _keys = ['fullName', 'dateOfBirth', 'documentType', 'documentNumber'];
  static const _labels = ['Full name', 'Date of birth', 'ID type', 'ID number'];
  @override
  void initState() {
    super.initState();
    final values = widget.session.extracted?.toJson() ?? {};
    _fields = _keys.map((key) => TextEditingController(text: values[key] as String? ?? '')).toList();
    final birth = DateTime.tryParse(_fields[1].text);
    if (birth != null) _fields[1].text = DateFormat('dd MMM yyyy').format(birth);
  }

  @override
  void dispose() {
    if (widget.preview != null) MemoryImage(widget.preview!).evict();
    for (final field in _fields) {
      field.dispose();
    }
    super.dispose();
  }

  String _birthDate(String raw) {
    if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(raw)) return raw;
    try {
      return DateFormat('yyyy-MM-dd').format(DateFormat('dd MMM yyyy').parseStrict(raw));
    } on FormatException {
      return '';
    }
  }

  void _confirm() {
    if (!_form.currentState!.validate()) return;
    widget.onConfirm(IdentityDetails(
        fullName: _fields[0].text.trim(),
        dateOfBirth: _birthDate(_fields[1].text.trim()),
        documentType: _fields[2].text.trim(),
        documentNumber: _fields[3].text.trim()));
  }

  @override
  Widget build(BuildContext context) => SafeArea(
          child: Column(children: [
        Align(
            alignment: Alignment.centerLeft,
            child: IconButton(
                tooltip: 'Back',
                onPressed: widget.busy ? null : widget.onBack ?? widget.onRecapture,
                icon: const Icon(Icons.arrow_back, color: ApplicationStyles.navy, size: 22))),
        Expanded(
            child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
                child: Form(
                    key: _form,
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      const Text('Review your details', style: ApplicationStyles.heading, textAlign: TextAlign.center),
                      const SizedBox(height: 10),
                      const Text('Check if the information is correct.',
                          style: ApplicationStyles.helper, textAlign: TextAlign.center),
                      const SizedBox(height: 24),
                      if (widget.preview != null) ...[
                        ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: AspectRatio(
                                aspectRatio: 1.586,
                                child: Image.memory(widget.preview!, fit: BoxFit.cover, gaplessPlayback: true))),
                        const SizedBox(height: 22),
                      ],
                      if (widget.error != null)
                        Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Semantics(
                                liveRegion: true, child: Text(widget.error!, style: ApplicationStyles.helper))),
                      for (var i = 0; i < _fields.length; i++) ...[
                        TextFormField(
                            controller: _fields[i],
                            enabled: !widget.busy,
                            autocorrect: false,
                            enableSuggestions: false,
                            style: ApplicationStyles.value,
                            maxLength: i == 0 ? 200 : 100,
                            decoration: InputDecoration(
                                labelText: _labels[i],
                                hintText: i == 1 ? 'DD MMM YYYY' : null,
                                floatingLabelBehavior: FloatingLabelBehavior.always,
                                labelStyle: ApplicationStyles.helper.copyWith(fontSize: 13),
                                counterText: '',
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: const BorderSide(color: ApplicationStyles.border)),
                                suffixIcon: (widget.session.confidence[_keys[i]] ?? 1) < .8
                                    ? const Tooltip(
                                        message: 'Please check this field carefully',
                                        child: Icon(Icons.info_outline, size: 18))
                                    : null),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) return 'Required';
                              if (i == 1) {
                                final normalized = _birthDate(value.trim());
                                final date = DateTime.tryParse(normalized);
                                if (date == null ||
                                    date.toIso8601String().substring(0, 10) != normalized ||
                                    date.isAfter(DateTime.now()) ||
                                    date.year < 1900) {
                                  return 'Enter a valid birth date';
                                }
                              }
                              return null;
                            }),
                        const SizedBox(height: 18),
                      ],
                    ])))),
        Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                    style: ApplicationStyles.button,
                    onPressed: widget.busy ? null : _confirm,
                    child: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Flexible(child: Text('Continue')),
                      SizedBox(width: 12),
                      Icon(Icons.arrow_forward, size: 19),
                    ])))),
      ]));
}
