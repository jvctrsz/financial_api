import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateTransactionService } from './services/create-transaction.service';
import { DeleteTransactionService } from './services/delete-transaction.service';
import { FindAllTransactionsService } from './services/find-all-transactions.service';
import { LinkOrphanInstallmentsService } from './services/link-orphan-installments.service';
import { UnlinkOrphanInstallmentsService } from './services/unlink-orphan-installments.service';
import { TransactionsController } from './transactions.controller';

const transactionServices = [
  CreateTransactionService,
  FindAllTransactionsService,
  DeleteTransactionService,
  LinkOrphanInstallmentsService,
  UnlinkOrphanInstallmentsService,
];

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: transactionServices,
  exports: transactionServices,
})
export class TransactionsModule {}
