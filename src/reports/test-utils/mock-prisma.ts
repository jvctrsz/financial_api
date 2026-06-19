export type MockPrismaService = {
  salaryPeriod: {
    findFirst: jest.Mock;
  };
  transaction: {
    aggregate: jest.Mock;
  };
  income: {
    aggregate: jest.Mock;
  };
  asideExpense: {
    aggregate: jest.Mock;
  };
};

export const makePrisma = (): MockPrismaService => ({
  salaryPeriod: {
    findFirst: jest.fn(),
  },
  transaction: {
    aggregate: jest.fn(),
  },
  income: {
    aggregate: jest.fn(),
  },
  asideExpense: {
    aggregate: jest.fn(),
  },
});
