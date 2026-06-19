import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { FindCurrentBalanceReportService } from './services/find-current-balance-report.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly findCurrentBalanceReportService: FindCurrentBalanceReportService,
  ) {}

  @Get('balance')
  findCurrentBalance(@Req() request: AuthenticatedRequest) {
    return this.findCurrentBalanceReportService.findCurrentBalance(
      request.user.id,
    );
  }
}
