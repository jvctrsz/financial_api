import { User } from '@prisma/client';

export type MockPrismaService = {
  $transaction: jest.Mock;
  user: {
    create: jest.Mock;
    findUnique: jest.Mock;
  };
  refreshToken: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
};

export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'User One',
  email: 'user@example.com',
  passwordHash: 'hashed-password',
  createdAt: new Date('2026-06-13T00:00:00.000Z'),
  updatedAt: new Date('2026-06-13T00:00:00.000Z'),
  ...overrides,
});

export const makePrisma = (): MockPrismaService => {
  const prisma: MockPrismaService = {
    $transaction: jest.fn(),
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  prisma.$transaction.mockImplementation((callback) => callback(prisma));

  return prisma;
};
