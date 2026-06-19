import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { FindCurrentBalanceReportService } from './services/find-current-balance-report.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [FindCurrentBalanceReportService],
})
export class ReportsModule {}
