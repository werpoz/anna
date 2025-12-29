export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('Invalid refresh token');
  }
}
