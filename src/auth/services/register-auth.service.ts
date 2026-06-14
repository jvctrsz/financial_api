import { ConflictException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from '../dto/register.dto';

type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class RegisterAuthService {
  constructor(private readonly prisma: PrismaService) {}

  register = async (dto: RegisterDto): Promise<SafeUser> => {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Este email ja esta em uso.');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
      },
    });

    return this.toSafeUser(user);
  };

  private toSafeUser = (user: User): SafeUser => {
    const { passwordHash, ...safeUser } = user;

    return safeUser;
  };
}
