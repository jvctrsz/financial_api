import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AsideExpensesModule } from './aside-expenses/aside-expenses.module';
import { AuthModule } from './auth/auth.module';
import { CardsModule } from './cards/cards.module';
import { CategoriesModule } from './categories/categories.module';
import { FixedExpensesModule } from './fixed-expenses/fixed-expenses.module';
import { InstallmentExpensesModule } from './installment-expenses/installment-expenses.module';
import { IncomesModule } from './incomes/incomes.module';
import { ReportsModule } from './reports/reports.module';
import { SalariesModule } from './salaries/salaries.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { GLOBAL_RATE_LIMIT } from './shared/constants/rate-limit.constants';
import { UserThrottlerGuard } from './shared/guards/user-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([GLOBAL_RATE_LIMIT.default]),
    AuthModule,
    CardsModule,
    CategoriesModule,
    SalariesModule,
    TransactionsModule,
    IncomesModule,
    UsersModule,
    AsideExpensesModule,
    InstallmentExpensesModule,
    FixedExpensesModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
  ],
})
export class AppModule {}
