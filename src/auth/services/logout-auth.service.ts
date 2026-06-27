import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../utils/hash-token.util';

@Injectable()
export class LogoutAuthService {
  constructor(private readonly prisma: PrismaService) {}

  logout = async (refreshToken?: string): Promise<void> => {
    if (!refreshToken) {
      return;
    }

    const persistedRefreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
      },
    });

    if (!persistedRefreshToken) {
      return;
    }

    await this.prisma.refreshToken.update({
      where: { id: persistedRefreshToken.id },
      data: { revokedAt: new Date() },
    });
  };
}
