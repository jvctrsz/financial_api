import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { READ_RATE_LIMIT } from '../shared/constants/rate-limit.constants';
import { FindBillingReportService } from './services/find-billing-report.service';
import { FindCurrentBalanceReportService } from './services/find-current-balance-report.service';
import { FindPeriodReportService } from './services/find-period-report.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtGuard)
@Throttle(READ_RATE_LIMIT)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly findCurrentBalanceReportService: FindCurrentBalanceReportService,
    private readonly findPeriodReportService: FindPeriodReportService,
    private readonly findBillingReportService: FindBillingReportService,
  ) {}

  @Get('balance')
  findCurrentBalance(@Req() request: AuthenticatedRequest) {
    return this.findCurrentBalanceReportService.findCurrentBalance(
      request.user.id,
    );
  }

  @Get('period/:periodId')
  findPeriodReport(
    @Req() request: AuthenticatedRequest,
    @Param('periodId') periodId: string,
  ) {
    return this.findPeriodReportService.findPeriodReport(
      request.user.id,
      periodId,
    );
  }

  @Get('billing')
  findBillingReport(
    @Req() request: AuthenticatedRequest,
    @Query('month') month: string,
  ) {
    return this.findBillingReportService.findBillingReport(
      request.user.id,
      month,
    );
  }
}
