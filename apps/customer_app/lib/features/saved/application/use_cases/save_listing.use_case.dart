import '../../ports/repositories/saved_repository.port.dart';

class SaveListingUseCase {
  const SaveListingUseCase(this._repo);
  final SavedRepository _repo;

  Future<List<String>> call(String id) => _repo.save(id);
  Future<List<String>> execute(String id) => _repo.save(id);
}
