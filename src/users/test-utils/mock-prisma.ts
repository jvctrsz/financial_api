export type MockPrismaService = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

export const makePrisma = (): MockPrismaService => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
});
