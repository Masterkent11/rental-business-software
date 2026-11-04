export interface MarketingMediaProcessor {
  prepare(
    data: string,
    contentType: string,
  ): Promise<{ body: Buffer; contentType: string }>;
}
