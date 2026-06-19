import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FindMeUserService } from './services/find-me-user.service';
import { UsersController } from './users.controller';

const userServices = [FindMeUserService];

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: userServices,
})
export class UsersModule {}
