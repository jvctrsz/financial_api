import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateTransactionService } from './services/create-transaction.service';
import { DeleteTransactionService } from './services/delete-transaction.service';
import { FindAllTransactionsService } from './services/find-all-transactions.service';
import { LinkOrphanInstallmentsService } from './services/link-orphan-installments.service';
import { PayTransactionService } from './services/pay-transaction.service';
import { UnlinkOrphanInstallmentsService } from './services/unlink-orphan-installments.service';
import { TransactionsController } from './transactions.controller';

const transactionServices = [
  CreateTransactionService,
  FindAllTransactionsService,
  DeleteTransactionService,
  PayTransactionService,
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
