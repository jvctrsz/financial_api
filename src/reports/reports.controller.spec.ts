import { ReportsController } from './reports.controller';

describe('ReportsController', () => {
  let findCurrentBalanceReportService: {
    findCurrentBalance: jest.Mock;
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
    controller = new ReportsController(
      findCurrentBalanceReportService as never,
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

    expect(
      findCurrentBalanceReportService.findCurrentBalance,
    ).toHaveBeenCalledWith('user-1');
  });
});
