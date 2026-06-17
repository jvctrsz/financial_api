import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateIncomeDto } from './dto/create-income.dto';
import { CreateIncomeService } from './services/create-income.service';
import { DeleteIncomeService } from './services/delete-income.service';
import { FindIncomesByMonthService } from './services/find-incomes-by-month.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtGuard)
@Controller('incomes')
export class IncomesController {
  constructor(
    private readonly createIncomeService: CreateIncomeService,
    private readonly findIncomesByMonthService: FindIncomesByMonthService,
    private readonly deleteIncomeService: DeleteIncomeService,
  ) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateIncomeDto) {
    return this.createIncomeService.createIncome(request.user.id, dto);
  }

  @Get()
  findByMonth(
    @Req() request: AuthenticatedRequest,
    @Query('month') month?: string,
  ) {
    return this.findIncomesByMonthService.findIncomesByMonth(
      request.user.id,
      month,
    );
  }

  @Delete(':id')
  delete(@Req() request: AuthenticatedRequest, @Param('id') incomeId: string) {
    return this.deleteIncomeService.deleteIncome(request.user.id, incomeId);
  }
}
