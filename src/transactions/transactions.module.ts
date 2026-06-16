import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateTransactionService } from './services/create-transaction.service';
import { DeleteTransactionService } from './services/delete-transaction.service';
import { FindAllTransactionsService } from './services/find-all-transactions.service';
import { TransactionsController } from './transactions.controller';

const transactionServices = [
  CreateTransactionService,
  FindAllTransactionsService,
  DeleteTransactionService,
];

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: transactionServices,
  exports: transactionServices,
})
export class TransactionsModule {}
