export interface RefreshTokenHasher {
  hash(token: string): string;
}
