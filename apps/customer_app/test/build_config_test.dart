import 'package:customer_app/app/app_config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('compiled public configuration is valid or explicitly absent in unit tests', () {
    if (AppConfig.configuredAppEnv.isEmpty) {
      expect(AppConfig.fromBuild, throwsA(isA<AppConfigurationError>()));
    } else {
      expect(AppConfig.fromBuild().environment.name, AppConfig.configuredAppEnv);
    }
  });
}
