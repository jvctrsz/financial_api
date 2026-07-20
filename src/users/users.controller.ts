import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import {
  READ_RATE_LIMIT,
  WRITE_RATE_LIMIT,
} from '../shared/constants/rate-limit.constants';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindMeUserService } from './services/find-me-user.service';
import { UpdateUserService } from './services/update-user.service';

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
    private readonly updateUserService: UpdateUserService,
  ) {}

  @Get('me')
  @Throttle(READ_RATE_LIMIT)
  findMe(@Req() request: AuthenticatedRequest) {
    return this.findMeUserService.findMe(request.user.id);
  }

  @Patch('me')
  @Throttle(WRITE_RATE_LIMIT)
  updateMe(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateUserDto,
  ) {
    return this.updateUserService.updateUser(request.user.id, dto);
  }
}
