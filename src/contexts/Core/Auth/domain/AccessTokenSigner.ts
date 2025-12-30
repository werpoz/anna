export interface AccessTokenSigner {
  sign(userId: string, email: string, expiresInSeconds: number): Promise<string>;
}
