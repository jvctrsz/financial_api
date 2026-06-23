export type MockPrismaService = {
  $transaction: jest.Mock;
  fixedExpense: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  category: {
    findFirst: jest.Mock;
  };
  card: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
  salaryPeriod: {
    findFirst: jest.Mock;
  };
  transaction: {
    create: jest.Mock;
    updateMany: jest.Mock;
  };
};

export const makePrisma = (): MockPrismaService => {
  const prisma: MockPrismaService = {
    $transaction: jest.fn(),
    fixedExpense: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    card: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    salaryPeriod: {
      findFirst: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  prisma.$transaction.mockImplementation((callback) => callback(prisma));

  return prisma;
};
