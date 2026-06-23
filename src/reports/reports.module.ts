import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { FindBillingReportService } from './services/find-billing-report.service';
import { FindCurrentBalanceReportService } from './services/find-current-balance-report.service';
import { FindPeriodReportService } from './services/find-period-report.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [
    FindCurrentBalanceReportService,
    FindPeriodReportService,
    FindBillingReportService,
  ],
})
export class ReportsModule {}
