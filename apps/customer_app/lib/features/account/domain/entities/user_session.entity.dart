/// Domain entity representing a user session.
class UserSession {
  const UserSession({
    required this.userId,
    required this.accessToken,
    this.email,
    this.phone,
  });

  final String userId;
  final String accessToken;
  final String? email;
  final String? phone;
}
