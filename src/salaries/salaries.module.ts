import { Module } from '@nestjs/common';
import { FixedExpensesModule } from '../fixed-expenses/fixed-expenses.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { SalariesController } from './salaries.controller';
import { CreateSalaryService } from './services/create-salary.service';
import { DeleteSalaryService } from './services/delete-salary.service';
import { FindAllSalariesService } from './services/find-all-salaries.service';
import { FindCurrentSalaryByDateService } from './services/find-current-salary-by-date.service';
import { FindCurrentSalaryService } from './services/find-current-salary.service';

const salaryServices = [
  CreateSalaryService,
  DeleteSalaryService,
  FindAllSalariesService,
  FindCurrentSalaryByDateService,
  FindCurrentSalaryService,
];

@Module({
  imports: [PrismaModule, TransactionsModule, FixedExpensesModule],
  controllers: [SalariesController],
  providers: salaryServices,
  exports: salaryServices,
})
export class SalariesModule {}
