export type TokenResult = {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
};

export type LoginMetadata = {
  userAgent?: string;
  ip?: string;
};
