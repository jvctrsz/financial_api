export type MockPrismaService = {
  income: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  salary?: {
    findFirst: jest.Mock;
  };
  salaryPeriod?: {
    findFirst: jest.Mock;
  };
  transaction?: {
    create: jest.Mock;
  };
  user?: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};

export const makePrisma = (): MockPrismaService => ({
  income: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  salary: {
    findFirst: jest.fn(),
  },
  salaryPeriod: {
    findFirst: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
});
