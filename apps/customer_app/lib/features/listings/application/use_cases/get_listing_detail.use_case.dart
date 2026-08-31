import '../../domain/entities/listing_detail.entity.dart';
import '../../ports/repositories/listing_repository.port.dart';

class GetListingDetailUseCase {
  const GetListingDetailUseCase(this._repo);
  final ListingRepository _repo;

  Future<ListingDetail?> call(String id) => _repo.detail(id);
  Future<ListingDetail?> execute(String id) => _repo.detail(id);
}
