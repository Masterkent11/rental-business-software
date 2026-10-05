import '../../../fixtures/view_models.dart';
import '../domain/property_search_criteria.dart';

abstract interface class PropertySearchRepository {
  Future<List<ListingCardView>> searchProperties(
    PropertySearchCriteria criteria,
  );
}
