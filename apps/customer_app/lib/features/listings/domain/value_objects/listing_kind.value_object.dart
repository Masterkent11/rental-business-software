enum ListingKind {
  longTerm('Long-term'),
  shortTerm('Nightly');

  const ListingKind(this.label);
  final String label;
}
