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
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import {
  READ_RATE_LIMIT,
  WRITE_RATE_LIMIT,
} from '../shared/constants/rate-limit.constants';
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
  @Throttle(WRITE_RATE_LIMIT)
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
  @Throttle(READ_RATE_LIMIT)
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
  @Throttle(WRITE_RATE_LIMIT)
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
  @Throttle(WRITE_RATE_LIMIT)
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

