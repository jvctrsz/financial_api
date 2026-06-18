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
import { CreateAsideExpenseDto } from './dto/create-aside-expense.dto';
import { CreateAsideExpenseService } from './services/create-aside-expense.service';
import { DeleteAsideExpenseService } from './services/delete-aside-expense.service';
import { FindAllAsideExpensesService } from './services/find-all-aside-expenses.service';

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
  ) {}

  @Post()
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
  findAll(@Req() request: AuthenticatedRequest) {
    return this.findAllAsideExpensesService.findAllAsideExpenses(
      request.user.id,
    );
  }

  @Delete(':id')
  delete(
    @Req() request: AuthenticatedRequest,
    @Param('id') asideExpenseId: string,
  ) {
    return this.deleteAsideExpenseService.deleteAsideExpense(
      request.user.id,
      asideExpenseId,
    );
  }
}
