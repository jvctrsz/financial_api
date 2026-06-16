export type MockPrismaService = {
  card: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    delete: jest.Mock;
  };
  $transaction: <T>(
    callback: (tx: MockPrismaService) => Promise<T>,
  ) => Promise<T>;
};

export const makePrisma = (): MockPrismaService => {
  const prisma: MockPrismaService = {
    card: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: <T>(callback: (tx: MockPrismaService) => Promise<T>) =>
      callback(prisma),
  };

  return prisma;
};
