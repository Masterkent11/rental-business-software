import '../../domain/entities/account_profile.entity.dart';
import '../dto/account_profile.dto.dart';

extension AccountProfileMapper on AccountProfileDto {
  AccountProfile toDomain() => AccountProfile(
        id: id,
        displayName: displayName,
        primaryEmail: primaryEmail,
        primaryPhone: primaryPhone,
        capabilities: capabilities,
        activeTenantLeaseCount: activeTenantLeaseCount,
        activeOwnerPropertyCount: activeOwnerPropertyCount,
      );
}
