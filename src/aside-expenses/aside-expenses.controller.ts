import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { CreateAsideExpenseDto } from './dto/create-aside-expense.dto';
import { FinishAsideExpenseDto } from './dto/finish-aside-expense.dto';
import { CreateAsideExpenseService } from './services/create-aside-expense.service';
import { DeleteAsideExpenseService } from './services/delete-aside-expense.service';
import { FindAllAsideExpensesService } from './services/find-all-aside-expenses.service';
import { FinishAsideExpenseService } from './services/finish-aside-expense.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtGuard)
@Controller('aside-expenses')
export class AsideExpensesController {
  constructor(
    private readonly createAsideExpenseService: CreateAsideExpenseService,
    private readonly findAllAsideExpensesService: FindAllAsideExpensesService,
    private readonly deleteAsideExpenseService: DeleteAsideExpenseService,
    private readonly finishAsideExpenseService: FinishAsideExpenseService,
  ) {}

  @Post()
  @Throttle(WRITE_RATE_LIMIT)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAsideExpenseDto,
  ) {
    return this.createAsideExpenseService.createAsideExpense(
      request.user.id,
      dto,
    );
  }

  @Get()
  @Throttle(READ_RATE_LIMIT)
  findAll(@Req() request: AuthenticatedRequest) {
    return this.findAllAsideExpensesService.findAllAsideExpenses(
      request.user.id,
    );
  }

  @Delete(':id')
  @Throttle(WRITE_RATE_LIMIT)
  delete(
    @Req() request: AuthenticatedRequest,
    @Param('id') asideExpenseId: string,
  ) {
    return this.deleteAsideExpenseService.deleteAsideExpense(
      request.user.id,
      asideExpenseId,
    );
  }

  @Patch(':id/finish')
  @Throttle(WRITE_RATE_LIMIT)
  finish(
    @Req() request: AuthenticatedRequest,
    @Param('id') asideExpenseId: string,
    @Body() dto: FinishAsideExpenseDto,
  ) {
    return this.finishAsideExpenseService.finishAsideExpense(
      request.user.id,
      asideExpenseId,
      dto,
    );
  }
}
