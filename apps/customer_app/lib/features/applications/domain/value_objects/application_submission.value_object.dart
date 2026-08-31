class ApplicationSubmission {
  const ApplicationSubmission({
    required this.resourceId,
    required this.desiredMoveIn,
    this.desiredTermMonths,
    this.message = '',
    this.documentPaths = const [],
  });

  final String resourceId;
  final DateTime desiredMoveIn;
  final int? desiredTermMonths;
  final String message;
  final List<String> documentPaths;
}
