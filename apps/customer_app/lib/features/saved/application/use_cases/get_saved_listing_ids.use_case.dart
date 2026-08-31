import '../../ports/repositories/saved_repository.port.dart';

class GetSavedListingIdsUseCase {
  const GetSavedListingIdsUseCase(this._repo);
  final SavedRepository _repo;

  Future<List<String>> call() => _repo.savedIds();
  Future<List<String>> execute() => _repo.savedIds();
}
