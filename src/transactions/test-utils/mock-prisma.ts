export type MockPrismaService = {
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
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};

export const makePrisma = (): MockPrismaService => ({
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
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
});
