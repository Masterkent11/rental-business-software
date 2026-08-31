import '../../domain/entities/listing.entity.dart';
import '../../domain/entities/listing_detail.entity.dart';

abstract interface class ListingRepository {
  Future<List<Listing>> search([dynamic criteria]);
  Future<List<Listing>> all();
  Future<List<Listing>> getListingsByIds(Iterable<String> ids);
  Future<List<Listing>> byIds(Iterable<String> ids);
  Future<ListingDetail?> getDetail(String id);
  Future<ListingDetail?> detail(String id);
}
