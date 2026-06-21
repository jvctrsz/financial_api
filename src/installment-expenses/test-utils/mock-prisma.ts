export type MockPrismaService = {
  $transaction: jest.Mock;
  installmentExpense: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  category: {
    findFirst: jest.Mock;
  };
  card: {
    findFirst: jest.Mock;
  };
  salaryPeriod: {
    findFirst: jest.Mock;
  };
  transaction: {
    create: jest.Mock;
    updateMany: jest.Mock;
    delete: jest.Mock;
  };
};

export const makePrisma = (): MockPrismaService => {
  const prisma = {
    $transaction: jest.fn(),
    installmentExpense: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    card: {
      findFirst: jest.fn(),
    },
    salaryPeriod: {
      findFirst: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  prisma.$transaction.mockImplementation((callback) => callback(prisma));

  return prisma;
};
