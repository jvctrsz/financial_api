import type { Request } from 'express';

export const RATE_LIMIT_TTL = 60_000;

export const GLOBAL_RATE_LIMIT = {
  default: {
    limit: 100,
    ttl: RATE_LIMIT_TTL,
  },
};

export const READ_RATE_LIMIT = {
  default: {
    limit: 300,
    ttl: RATE_LIMIT_TTL,
  },
};

export const WRITE_RATE_LIMIT = {
  default: {
    limit: 30,
    ttl: RATE_LIMIT_TTL,
  },
};

export const AUTH_RATE_LIMIT = {
  default: {
    limit: 10,
    ttl: RATE_LIMIT_TTL,
    getTracker: (request: Request) => request.ip ?? 'unknown-ip',
  },
};
