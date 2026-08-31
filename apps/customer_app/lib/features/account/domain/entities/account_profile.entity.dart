import '../value_objects/account_capability.value_object.dart';

/// Domain entity representing a customer account profile (/me).
class AccountProfile {
  const AccountProfile({
    required this.id,
    required this.displayName,
    this.primaryEmail,
    this.primaryPhone,
    this.capabilities = const [],
    this.activeTenantLeaseCount = 0,
    this.activeOwnerPropertyCount = 0,
  });

  final String id;
  final String displayName;
  final String? primaryEmail;
  final String? primaryPhone;
  final List<AccountCapability> capabilities;
  final int activeTenantLeaseCount;
  final int activeOwnerPropertyCount;

  bool get isTenant =>
      activeTenantLeaseCount > 0 ||
      capabilities.any((c) => c.capability == 'TENANT');

  bool get isOwner =>
      activeOwnerPropertyCount > 0 ||
      capabilities.any((c) => c.capability == 'OWNER');
}
