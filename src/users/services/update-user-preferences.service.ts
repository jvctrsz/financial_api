import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { userPublicSelect } from './user-public-select';

@Injectable()
export class UpdateUserPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  updatePreferences = async (
    userId: string,
    includeIncomesInBalance: boolean,
  ) => {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        includeIncomesInBalance,
      },
      select: userPublicSelect,
    });
  };
}
