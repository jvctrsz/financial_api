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
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';
import { CreateFixedExpenseService } from './services/create-fixed-expense.service';
import { DeleteFixedExpenseService } from './services/delete-fixed-expense.service';
import { FindAllFixedExpensesService } from './services/find-all-fixed-expenses.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtGuard)
@Controller('fixed-expenses')
export class FixedExpensesController {
  constructor(
    private readonly createFixedExpenseService: CreateFixedExpenseService,
    private readonly findAllFixedExpensesService: FindAllFixedExpensesService,
    private readonly deleteFixedExpenseService: DeleteFixedExpenseService,
  ) {}

  @Post()
  @Throttle(WRITE_RATE_LIMIT)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateFixedExpenseDto,
  ) {
    return this.createFixedExpenseService.createFixedExpense(
      request.user.id,
      dto,
    );
  }

  @Get()
  @Throttle(READ_RATE_LIMIT)
  findAll(@Req() request: AuthenticatedRequest) {
    return this.findAllFixedExpensesService.findAllFixedExpenses(
      request.user.id,
    );
  }

  @Delete(':id')
  @Throttle(WRITE_RATE_LIMIT)
  delete(
    @Req() request: AuthenticatedRequest,
    @Param('id') fixedExpenseId: string,
  ) {
    return this.deleteFixedExpenseService.deleteFixedExpense(
      request.user.id,
      fixedExpenseId,
    );
  }
}
