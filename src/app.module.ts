import { Module } from '@nestjs/common';
import { SalariesModule } from './salaries/salaries.module';

@Module({
  imports: [SalariesModule],
})
export class AppModule {}
