export type AuthPayload = {
  userId: string;
  email?: string;
};

export type AppEnv = {
  Variables: {
    auth?: AuthPayload;
  };
};
