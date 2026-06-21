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
import { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateInstallmentExpenseDto } from './dto/create-installment-expense.dto';
import { CreateInstallmentExpenseService } from './services/create-installment-expense.service';
import { DeleteInstallmentExpenseService } from './services/delete-installment-expense.service';
import { FindAllInstallmentExpensesService } from './services/find-all-installment-expenses.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtGuard)
@Controller('installment-expenses')
export class InstallmentExpensesController {
  constructor(
    private readonly createInstallmentExpenseService: CreateInstallmentExpenseService,
    private readonly findAllInstallmentExpensesService: FindAllInstallmentExpensesService,
    private readonly deleteInstallmentExpenseService: DeleteInstallmentExpenseService,
  ) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateInstallmentExpenseDto,
  ) {
    return this.createInstallmentExpenseService.createInstallmentExpense(
      request.user.id,
      dto,
    );
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.findAllInstallmentExpensesService.findAllInstallmentExpenses(
      request.user.id,
    );
  }

  @Delete(':id')
  delete(
    @Req() request: AuthenticatedRequest,
    @Param('id') installmentExpenseId: string,
  ) {
    return this.deleteInstallmentExpenseService.deleteInstallmentExpense(
      request.user.id,
      installmentExpenseId,
    );
  }
}
