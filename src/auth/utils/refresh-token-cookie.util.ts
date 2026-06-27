export const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/auth',
  sameSite: 'lax' as const,
  secure: false,
};
