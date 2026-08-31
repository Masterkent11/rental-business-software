import '../../ports/repositories/saved_repository.port.dart';

class UnsaveListingUseCase {
  const UnsaveListingUseCase(this._repo);
  final SavedRepository _repo;

  Future<List<String>> call(String id) => _repo.unsave(id);
  Future<List<String>> execute(String id) => _repo.unsave(id);
}
