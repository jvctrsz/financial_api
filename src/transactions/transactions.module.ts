import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateTransactionService } from './services/create-transaction.service';
import { DeleteTransactionService } from './services/delete-transaction.service';
import { FindAllTransactionsService } from './services/find-all-transactions.service';
import { LinkOrphanTransactionsService } from './services/link-orphan-transactions.service';
import { UnlinkOrphanTransactionsService } from './services/unlink-orphan-transactions.service';
import { TransactionsController } from './transactions.controller';

const transactionServices = [
  CreateTransactionService,
  FindAllTransactionsService,
  DeleteTransactionService,
  LinkOrphanTransactionsService,
  UnlinkOrphanTransactionsService,
];

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: transactionServices,
  exports: transactionServices,
})
export class TransactionsModule {}
