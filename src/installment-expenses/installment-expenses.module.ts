import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { InstallmentExpensesController } from './installment-expenses.controller';
import { CreateInstallmentExpenseService } from './services/create-installment-expense.service';
import { DeleteInstallmentExpenseService } from './services/delete-installment-expense.service';
import { FindAllInstallmentExpensesService } from './services/find-all-installment-expenses.service';

const InstallmentExpenseServices = [
  CreateInstallmentExpenseService,
  FindAllInstallmentExpensesService,
  DeleteInstallmentExpenseService,
];

@Module({
  imports: [PrismaModule, TransactionsModule],
  controllers: [InstallmentExpensesController],
  providers: InstallmentExpenseServices,
})
export class InstallmentExpensesModule {}
