import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { userPublicSelect } from './user-public-select';

@Injectable()
export class FindMeUserService {
  constructor(private readonly prisma: PrismaService) {}

  findMe = async (userId: string) => {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userPublicSelect,
    });

    if (!user) {
      throw new NotFoundException('Usu[ario não encontrado.');
    }

    return user;
  };
}
