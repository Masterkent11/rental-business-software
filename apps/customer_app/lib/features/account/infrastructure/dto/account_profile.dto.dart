/// DTO for raw JSON returned by `/me` endpoint.
class AccountProfileDto {
  const AccountProfileDto({
    required this.id,
    required this.displayName,
    this.primaryEmail,
    this.primaryPhone,
    this.capabilities = const [],
    this.activeTenantLeaseCount = 0,
    this.activeOwnerPropertyCount = 0,
  });

  factory AccountProfileDto.fromJson(Map<String, dynamic> json) {
    final capsRaw = json['capabilities'] as List<dynamic>? ?? [];
    final capabilities = capsRaw.map((c) {
      if (c is Map<String, dynamic>) {
        return (
          capability: c['capability'] as String? ?? '',
          organizationId: c['organizationId'] as String?,
        );
      }
      return (capability: c.toString(), organizationId: null);
    }).toList();

    return AccountProfileDto(
      id: json['id'] as String? ?? '',
      displayName: json['displayName'] as String? ?? json['name'] as String? ?? 'User',
      primaryEmail: json['primaryEmail'] as String? ?? json['email'] as String?,
      primaryPhone: json['primaryPhone'] as String? ?? json['phone'] as String?,
      capabilities: capabilities,
      activeTenantLeaseCount: json['activeTenantLeaseCount'] as int? ?? 0,
      activeOwnerPropertyCount: json['activeOwnerPropertyCount'] as int? ?? 0,
    );
  }

  final String id;
  final String displayName;
  final String? primaryEmail;
  final String? primaryPhone;
  final List<({String capability, String? organizationId})> capabilities;
  final int activeTenantLeaseCount;
  final int activeOwnerPropertyCount;
}
