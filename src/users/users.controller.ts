import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { FindMeUserService } from './services/find-me-user.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly findMeUserService: FindMeUserService) {}

  @Get('me')
  findMe(@Req() request: AuthenticatedRequest) {
    return this.findMeUserService.findMe(request.user.id);
  }
}
