export type MockPrismaService = {
  asideExpense: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  transaction: {
    create: jest.Mock;
  };
  salary: {
    findFirst: jest.Mock;
  };
  salaryPeriod: {
    findFirst: jest.Mock;
  };
  category: {
    findFirst: jest.Mock;
  };
  card: {
    findFirst: jest.Mock;
  };
  user: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};

export const makePrisma = (): MockPrismaService => ({
  asideExpense: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
  salary: {
    findFirst: jest.fn(),
  },
  salaryPeriod: {
    findFirst: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
  },
  card: {
    findFirst: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
});
