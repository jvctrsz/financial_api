import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { userPublicSelect } from './user-public-select';

@Injectable()
export class UpdateUserService {
  constructor(private readonly prisma: PrismaService) {}

  updateUser = async (userId: string, dto: UpdateUserDto) => {
    const hasName = dto.name !== undefined;
    const hasEmail = dto.email !== undefined;
    const hasPassword = dto.password !== undefined;

    if (!hasName && !hasEmail && !hasPassword) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (hasEmail && dto.email !== user.email) {
      const emailOwner = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      });

      if (emailOwner && emailOwner.id !== userId) {
        throw new ConflictException('Este email já esta em uso.');
      }
    }

    const passwordHash = hasPassword
      ? await argon2.hash(dto.password as string)
      : undefined;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(hasName ? { name: dto.name } : {}),
        ...(hasEmail ? { email: dto.email } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: userPublicSelect,
    });
  };
}
