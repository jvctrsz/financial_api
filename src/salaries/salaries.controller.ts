import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import {
  READ_RATE_LIMIT,
  WRITE_RATE_LIMIT,
} from '../shared/constants/rate-limit.constants';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { CreateSalaryService } from './services/create-salary.service';
import { DeleteSalaryService } from './services/delete-salary.service';
import { FindAllSalariesService } from './services/find-all-salaries.service';
import { FindCurrentSalaryService } from './services/find-current-salary.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtGuard)
@Controller('salaries')
export class SalariesController {
  constructor(
    private readonly createSalaryService: CreateSalaryService,
    private readonly deleteSalaryService: DeleteSalaryService,
    private readonly findAllSalariesService: FindAllSalariesService,
    private readonly findCurrentSalaryService: FindCurrentSalaryService,
  ) {}

  @Post()
  @Throttle(WRITE_RATE_LIMIT)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateSalaryDto) {
    return this.createSalaryService.createSalary(request.user.id, dto);
  }

  @Get()
  @Throttle(READ_RATE_LIMIT)
  findAll(@Req() request: AuthenticatedRequest) {
    return this.findAllSalariesService.findAllSalaries(request.user.id);
  }

  @Get('current')
  @Throttle(READ_RATE_LIMIT)
  findCurrent(@Req() request: AuthenticatedRequest) {
    return this.findCurrentSalaryService.findCurrentSalary(request.user.id);
  }

  @Delete(':id')
  @Throttle(WRITE_RATE_LIMIT)
  delete(@Req() request: AuthenticatedRequest, @Param('id') salaryId: string) {
    return this.deleteSalaryService.deleteSalary(request.user.id, salaryId);
  }
}
