import '../domain/property_search_criteria.dart';
import 'property_search_repository.dart';

class SearchProperties {
  const SearchProperties(this._repository);

  final PropertySearchRepository _repository;

  Future<PropertySearchPage> call(
    PropertySearchCriteria criteria, {
    int offset = 0,
    PropertyRefinements refinements = const PropertyRefinements(),
  }) {
    return _repository.searchProperties(criteria, offset: offset, refinements: refinements);
  }
}
