import '../../domain/entities/listing.entity.dart';
import '../../domain/value_objects/listing_search_filters.value_object.dart';
import '../../ports/repositories/listing_repository.port.dart';

class SearchListingsUseCase {
  const SearchListingsUseCase(this._repo);
  final ListingRepository _repo;

  Future<List<Listing>> call([dynamic filters]) => _repo.search(filters);
  Future<List<Listing>> execute(ListingSearchFilters filters) => _repo.search(filters);
}
