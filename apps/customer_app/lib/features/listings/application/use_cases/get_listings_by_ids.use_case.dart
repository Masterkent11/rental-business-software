import '../../domain/entities/listing.entity.dart';
import '../../ports/repositories/listing_repository.port.dart';

class GetListingsByIdsUseCase {
  const GetListingsByIdsUseCase(this._repo);
  final ListingRepository _repo;

  Future<List<Listing>> call(Iterable<String> ids) => _repo.byIds(ids);
  Future<List<Listing>> execute(Iterable<String> ids) => _repo.byIds(ids);
}
