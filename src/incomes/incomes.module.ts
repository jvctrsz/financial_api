import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IncomesController } from './incomes.controller';
import { CreateIncomeService } from './services/create-income.service';
import { DeleteIncomeService } from './services/delete-income.service';
import { FindIncomesByMonthService } from './services/find-incomes-by-month.service';

const incomeServices = [
  CreateIncomeService,
  FindIncomesByMonthService,
  DeleteIncomeService,
];

@Module({
  imports: [PrismaModule],
  controllers: [IncomesController],
  providers: incomeServices,
})
export class IncomesModule {}
