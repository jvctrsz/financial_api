import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AsideExpensesModule } from './aside-expenses/aside-expenses.module';
import { AuthModule } from './auth/auth.module';
import { CardsModule } from './cards/cards.module';
import { CategoriesModule } from './categories/categories.module';
import { FixedExpensesModule } from './fixed-expenses/fixed-expenses.module';
import { IncomesModule } from './incomes/incomes.module';
import { ReportsModule } from './reports/reports.module';
import { SalariesModule } from './salaries/salaries.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    CardsModule,
    CategoriesModule,
    SalariesModule,
    TransactionsModule,
    IncomesModule,
    UsersModule,
    AsideExpensesModule,
    FixedExpensesModule,
    ReportsModule,
  ],
})
export class AppModule {}
