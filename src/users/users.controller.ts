import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { FindMeUserService } from './services/find-me-user.service';
import { UpdateUserPreferencesService } from './services/update-user-preferences.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly findMeUserService: FindMeUserService,
    private readonly updateUserPreferencesService: UpdateUserPreferencesService,
  ) {}

  @Get('me')
  findMe(@Req() request: AuthenticatedRequest) {
    return this.findMeUserService.findMe(request.user.id);
  }

  @Patch('me/preferences')
  updatePreferences(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateUserPreferencesDto,
  ) {
    return this.updateUserPreferencesService.updatePreferences(
      request.user.id,
      dto.includeIncomesInBalance,
    );
  }
}
