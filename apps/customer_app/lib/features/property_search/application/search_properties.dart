import '../../../fixtures/view_models.dart';
import '../domain/property_search_criteria.dart';
import 'property_search_repository.dart';

class SearchProperties {
  const SearchProperties(this._repository);

  final PropertySearchRepository _repository;

  Future<List<ListingCardView>> call(PropertySearchCriteria criteria) {
    return _repository.searchProperties(criteria);
  }
}
