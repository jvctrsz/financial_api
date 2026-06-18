import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FindMeUserService } from './services/find-me-user.service';
import { UpdateUserPreferencesService } from './services/update-user-preferences.service';
import { UsersController } from './users.controller';

const userServices = [FindMeUserService, UpdateUserPreferencesService];

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: userServices,
})
export class UsersModule {}
