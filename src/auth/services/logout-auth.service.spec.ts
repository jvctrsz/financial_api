import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../utils/hash-token.util';
import { makePrisma, MockPrismaService } from './auth-test-utils';
import { LogoutAuthService } from './logout-auth.service';

describe('LogoutAuthService', () => {
  let prisma: MockPrismaService;
  let service: LogoutAuthService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new LogoutAuthService(prisma as unknown as PrismaService);
  });

  it('deve revogar apenas o RefreshToken correspondente ao cookie', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'refresh-token-id',
      userId: 'user-1',
      tokenHash: hashToken('refresh-token'),
      expiresAt: new Date('2026-06-20T00:00:00.000Z'),
      revokedAt: null,
      createdAt: new Date('2026-06-13T00:00:00.000Z'),
    });

    await service.logout('refresh-token');

    expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
      where: {
        tokenHash: hashToken('refresh-token'),
        revokedAt: null,
      },
    });
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'refresh-token-id' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('não deve lancar erro sem cookie', async () => {
    await expect(service.logout()).resolves.toBeUndefined();

    expect(prisma.refreshToken.findFirst).not.toHaveBeenCalled();
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });

  it('não deve lancar erro com token ja revogado ou inexistente', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue(null);

    await expect(service.logout('revoked-token')).resolves.toBeUndefined();

    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });
});
