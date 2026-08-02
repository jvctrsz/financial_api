const isProduction = process.env.NODE_ENV === 'production';

export const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/auth',
  sameSite: isProduction ? ('none' as const) : ('lax' as const),
  secure: isProduction,
};
