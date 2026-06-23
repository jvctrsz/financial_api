import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { FixedExpensesController } from './fixed-expenses.controller';
import { CreateFixedExpenseService } from './services/create-fixed-expense.service';
import { DeleteFixedExpenseService } from './services/delete-fixed-expense.service';
import { FindAllFixedExpensesService } from './services/find-all-fixed-expenses.service';
import { GenerateFixedExpenseTransactionsService } from './services/generate-fixed-expense-transactions.service';
import { GenerateSingleFixedExpenseTransactionService } from './services/generate-single-fixed-expense-transaction.service';

const fixedExpenseServices = [
  CreateFixedExpenseService,
  FindAllFixedExpensesService,
  DeleteFixedExpenseService,
  GenerateSingleFixedExpenseTransactionService,
  GenerateFixedExpenseTransactionsService,
];

@Module({
  imports: [PrismaModule, TransactionsModule],
  controllers: [FixedExpensesController],
  providers: fixedExpenseServices,
  exports: [GenerateFixedExpenseTransactionsService],
})
export class FixedExpensesModule {}
