abstract interface class SavedRepository {
  Future<List<String>> savedIds();
  Future<List<String>> savedListingIds();
  Future<List<String>> getSavedListingIds();
  Future<List<String>> save(String id);
  Future<List<String>> saveListing(String id);
  Future<List<String>> unsave(String id);
  Future<List<String>> unsaveListing(String id);
}
