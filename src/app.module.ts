import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SalariesModule } from './salaries/salaries.module';

@Module({
  imports: [SalariesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
