export const toWsUrl = (baseUrl, token) => {
  const url = new URL(baseUrl);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}/ws/sessions?accessToken=${encodeURIComponent(token)}`;
};
