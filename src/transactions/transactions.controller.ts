import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FindAllTransactionsQueryDto } from './dto/find-all-transactions-query.dto';
import { CreateTransactionService } from './services/create-transaction.service';
import { DeleteTransactionService } from './services/delete-transaction.service';
import { FindAllTransactionsService } from './services/find-all-transactions.service';
import { PayTransactionService } from './services/pay-transaction.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransactionService: CreateTransactionService,
    private readonly findAllTransactionsService: FindAllTransactionsService,
    private readonly deleteTransactionService: DeleteTransactionService,
    private readonly payTransactionService: PayTransactionService,
  ) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.createTransactionService.createTransaction(
      request.user.id,
      dto,
    );
  }

  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() query: FindAllTransactionsQueryDto,
  ) {
    return this.findAllTransactionsService.findAllTransactions(
      request.user.id,
      query,
    );
  }

  @Delete(':id')
  delete(
    @Req() request: AuthenticatedRequest,
    @Param('id') transactionId: string,
  ) {
    return this.deleteTransactionService.deleteTransaction(
      request.user.id,
      transactionId,
    );
  }

  @Patch(':id/pay')
  pay(
    @Req() request: AuthenticatedRequest,
    @Param('id') transactionId: string,
  ) {
    return this.payTransactionService.payTransaction(
      request.user.id,
      transactionId,
    );
  }
}

