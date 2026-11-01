export interface PartnerLogoProcessor {
  prepare(data: string, contentType: string): Promise<string>;
}
