import '../../domain/entities/account_profile.entity.dart';

abstract interface class AccountRepository {
  Future<AccountProfile?> getProfile();
  Future<List<String>> savedListingIds();
  Future<List<String>> save(String listingId);
  Future<List<String>> unsave(String listingId);
}
