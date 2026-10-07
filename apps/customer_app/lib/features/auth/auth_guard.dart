import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/auth_repository.dart';

bool requireSignIn(
  BuildContext context,
  WidgetRef ref, {
  required String resumeTo,
  required String reason,
}) {
  if (ref.read(isSignedInProvider)) return true;
  context.push(Routes.auth(from: resumeTo, reason: reason));
  return false;
}
