import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { FixedExpensesController } from './fixed-expenses.controller';
import { CreateFixedExpenseService } from './services/create-fixed-expense.service';
import { DeleteFixedExpenseService } from './services/delete-fixed-expense.service';
import { FindAllFixedExpensesService } from './services/find-all-fixed-expenses.service';

const fixedExpenseServices = [
  CreateFixedExpenseService,
  FindAllFixedExpensesService,
  DeleteFixedExpenseService,
];

@Module({
  imports: [PrismaModule, TransactionsModule],
  controllers: [FixedExpensesController],
  providers: fixedExpenseServices,
})
export class FixedExpensesModule {}
