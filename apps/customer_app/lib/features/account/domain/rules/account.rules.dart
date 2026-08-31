abstract final class AccountRules {
  static bool isValidEmail(String email) {
    return RegExp(r'^[\w\.-]+@[\w\.-]+\.\w{2,}$').hasMatch(email.trim());
  }

  static bool isValidMobile(String mobile) {
    final digits = mobile.replaceAll(RegExp(r'\D'), '');
    return digits.length >= 10 && digits.length <= 12;
  }

  static bool isValidPassword(String password) {
    return password.length >= 6;
  }
}
