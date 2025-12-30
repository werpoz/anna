import type { Context } from 'hono';

export const parseRequestBody = async <T>(c: Context): Promise<T | null> => {
  const contentType = c.req.header('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return (await c.req.json<T>()) as T;
    } catch {
      return null;
    }
  }

  try {
    const body = await c.req.parseBody();
    return Object.keys(body).length ? (body as T) : null;
  } catch {
    return null;
  }
};
