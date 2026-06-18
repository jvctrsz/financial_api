export type MockPrismaService = {
  salary: {
    create: jest.Mock;
    delete: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
  salaryPeriod: {
    create: jest.Mock;
    delete: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  transaction: {
    findFirst: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

export const makePrisma = (): MockPrismaService => {
  const prisma: MockPrismaService = {
    salary: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    salaryPeriod: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(<T>(callback: (tx: MockPrismaService) => Promise<T>) =>
      callback(prisma),
    ),
  };

  return prisma;
};
