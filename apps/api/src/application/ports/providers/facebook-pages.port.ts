export interface FacebookPage {
  readonly id: string;
  readonly name: string;
}

export interface FacebookPagesProvider {
  authorizationUrl(state: string): string;
  eligiblePages(
    code: string,
  ): Promise<readonly (FacebookPage & { token: string })[]>;
}
