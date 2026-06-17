import { CreateIncomeDto } from './dto/create-income.dto';
import { IncomesController } from './incomes.controller';

describe('IncomesController', () => {
  let createIncomeService: {
    createIncome: jest.Mock;
  };
  let findIncomesByMonthService: {
    findIncomesByMonth: jest.Mock;
  };
  let deleteIncomeService: {
    deleteIncome: jest.Mock;
  };
  let controller: IncomesController;

  const request = {
    user: {
      id: 'user-1',
      email: 'user@example.com',
    },
  } as never;

  beforeEach(() => {
    createIncomeService = {
      createIncome: jest.fn(),
    };
    findIncomesByMonthService = {
      findIncomesByMonth: jest.fn(),
    };
    deleteIncomeService = {
      deleteIncome: jest.fn(),
    };
    controller = new IncomesController(
      createIncomeService as never,
      findIncomesByMonthService as never,
      deleteIncomeService as never,
    );
  });

  it('deve chamar CreateIncomeService.createIncome no POST /incomes', () => {
    const dto: CreateIncomeDto = {
      amount: 500,
      description: 'Freelance landing page',
      month: '2025-06-15',
    };
    const income = { id: 'income-1' };

    createIncomeService.createIncome.mockReturnValue(income);

    expect(controller.create(request, dto)).toBe(income);
    expect(createIncomeService.createIncome).toHaveBeenCalledWith(
      'user-1',
      dto,
    );
  });

  it('deve chamar FindIncomesByMonthService.findIncomesByMonth no GET /incomes', () => {
    const incomes = [{ id: 'income-1' }];

    findIncomesByMonthService.findIncomesByMonth.mockReturnValue(incomes);

    expect(controller.findByMonth(request, '2025-06')).toBe(incomes);
    expect(
      findIncomesByMonthService.findIncomesByMonth,
    ).toHaveBeenCalledWith('user-1', '2025-06');
  });

  it('deve chamar DeleteIncomeService.deleteIncome no DELETE /incomes/:id', () => {
    const income = { id: 'income-1', deletedAt: new Date() };

    deleteIncomeService.deleteIncome.mockReturnValue(income);

    expect(controller.delete(request, 'income-1')).toBe(income);
    expect(deleteIncomeService.deleteIncome).toHaveBeenCalledWith(
      'user-1',
      'income-1',
    );
  });
});
