import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CardsModule } from './cards/cards.module';
import { CategoriesModule } from './categories/categories.module';
import { IncomesModule } from './incomes/incomes.module';
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
  ],
})
export class AppModule {}
