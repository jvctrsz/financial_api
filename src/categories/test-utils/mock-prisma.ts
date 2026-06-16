export type MockPrismaService = {
  category: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    delete: jest.Mock;
    update: jest.Mock;
  };
  transaction: {
    findFirst: jest.Mock;
  };
};

export const makePrisma = (): MockPrismaService => ({
  category: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  transaction: {
    findFirst: jest.fn(),
  },
});
