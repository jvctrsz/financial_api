type PrismaErrorLike = {
  code?: string;
};

export const isUniqueConstraintError = (
  error: unknown,
): error is PrismaErrorLike =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as PrismaErrorLike).code === 'P2002';
