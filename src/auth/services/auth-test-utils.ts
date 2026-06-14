import { User } from '@prisma/client';

export type MockPrismaService = {
  user: {
    create: jest.Mock;
    findUnique: jest.Mock;
  };
};

export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'User One',
  email: 'user@example.com',
  passwordHash: 'hashed-password',
  includeIncomesInBalance: false,
  createdAt: new Date('2026-06-13T00:00:00.000Z'),
  updatedAt: new Date('2026-06-13T00:00:00.000Z'),
  ...overrides,
});

export const makePrisma = (): MockPrismaService => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
});
