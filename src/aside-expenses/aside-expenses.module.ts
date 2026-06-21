import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AsideExpensesController } from './aside-expenses.controller';
import { CreateAsideExpenseService } from './services/create-aside-expense.service';
import { DeleteAsideExpenseService } from './services/delete-aside-expense.service';
import { FindAllAsideExpensesService } from './services/find-all-aside-expenses.service';
import { FinishAsideExpenseService } from './services/finish-aside-expense.service';

const asideExpenseServices = [
  CreateAsideExpenseService,
  FindAllAsideExpensesService,
  DeleteAsideExpenseService,
  FinishAsideExpenseService,
];

@Module({
  imports: [PrismaModule],
  controllers: [AsideExpensesController],
  providers: asideExpenseServices,
})
export class AsideExpensesModule {}
