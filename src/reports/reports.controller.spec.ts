import { ReportsController } from './reports.controller';

describe('ReportsController', () => {
  let findCurrentBalanceReportService: {
    findCurrentBalance: jest.Mock;
  };
  let findPeriodReportService: {
    findPeriodReport: jest.Mock;
  };
  let findBillingReportService: {
    findBillingReport: jest.Mock;
  };
  let controller: ReportsController;

  const request = {
    user: {
      id: 'user-1',
      email: 'user@example.com',
    },
  } as never;

  beforeEach(() => {
    findCurrentBalanceReportService = {
      findCurrentBalance: jest.fn(),
    };
    findPeriodReportService = {
      findPeriodReport: jest.fn(),
    };
    findBillingReportService = {
      findBillingReport: jest.fn(),
    };
    controller = new ReportsController(
      findCurrentBalanceReportService as never,
      findPeriodReportService as never,
      findBillingReportService as never,
    );
  });

  it('deve chamar findCurrentBalance usando req.user.id', () => {
    const balance = {
      available: 1850,
      periodId: 'period-1',
      periodStart: '2025-05-07',
      periodEnd: null,
    };

    findCurrentBalanceReportService.findCurrentBalance.mockReturnValue(balance);

    expect(controller.findCurrentBalance(request)).toBe(balance);
    expect(
      findCurrentBalanceReportService.findCurrentBalance,
    ).toHaveBeenCalledWith('user-1');
  });

  it('deve chamar findPeriodReport usando req.user.id e periodId', () => {
    const report = { period: { id: 'period-1' } };

    findPeriodReportService.findPeriodReport.mockReturnValue(report);

    expect(controller.findPeriodReport(request, 'period-1')).toBe(report);
    expect(findPeriodReportService.findPeriodReport).toHaveBeenCalledWith(
      'user-1',
      'period-1',
    );
  });

  it('deve chamar findBillingReport usando req.user.id e month', () => {
    const report = { month: '2025-05', total: 100 };

    findBillingReportService.findBillingReport.mockReturnValue(report);

    expect(controller.findBillingReport(request, '2025-05')).toBe(report);
    expect(findBillingReportService.findBillingReport).toHaveBeenCalledWith(
      'user-1',
      '2025-05',
    );
  });

  it('não deve aceitar userId por query, body ou params', () => {
    const requestWithInjectedUserId = {
      user: {
        id: 'user-1',
        email: 'user@example.com',
      },
      query: {
        userId: 'user-2',
      },
      body: {
        userId: 'user-3',
      },
      params: {
        userId: 'user-4',
      },
    } as never;

    controller.findCurrentBalance(requestWithInjectedUserId);
    controller.findPeriodReport(requestWithInjectedUserId, 'period-1');
    controller.findBillingReport(requestWithInjectedUserId, '2025-05');

    expect(
      findCurrentBalanceReportService.findCurrentBalance,
    ).toHaveBeenCalledWith('user-1');
    expect(findPeriodReportService.findPeriodReport).toHaveBeenCalledWith(
      'user-1',
      'period-1',
    );
    expect(findBillingReportService.findBillingReport).toHaveBeenCalledWith(
      'user-1',
      '2025-05',
    );
  });
});
