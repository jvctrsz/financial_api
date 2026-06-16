export type MockPrismaService = {
  salary: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
  salaryPeriod: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  transaction: {
    updateMany: jest.Mock;
  };
  $transaction: <T>(
    callback: (tx: MockPrismaService) => Promise<T>,
  ) => Promise<T>;
};

export const makePrisma = (): MockPrismaService => {
  const prisma: MockPrismaService = {
    salary: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    salaryPeriod: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      updateMany: jest.fn(),
    },
    $transaction: <T>(callback: (tx: MockPrismaService) => Promise<T>) =>
      callback(prisma),
  };

  return prisma;
};
