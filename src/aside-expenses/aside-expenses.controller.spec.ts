import { AsideExpensesController } from './aside-expenses.controller';
import { CreateAsideExpenseDto } from './dto/create-aside-expense.dto';

describe('AsideExpensesController', () => {
  let createAsideExpenseService: {
    createAsideExpense: jest.Mock;
  };
  let findAllAsideExpensesService: {
    findAllAsideExpenses: jest.Mock;
  };
  let deleteAsideExpenseService: {
    deleteAsideExpense: jest.Mock;
  };
  let controller: AsideExpensesController;

  const request = {
    user: {
      id: 'user-1',
      email: 'user@example.com',
    },
  } as never;

  beforeEach(() => {
    createAsideExpenseService = {
      createAsideExpense: jest.fn(),
    };
    findAllAsideExpensesService = {
      findAllAsideExpenses: jest.fn(),
    };
    deleteAsideExpenseService = {
      deleteAsideExpense: jest.fn(),
    };
    controller = new AsideExpensesController(
      createAsideExpenseService as never,
      findAllAsideExpensesService as never,
      deleteAsideExpenseService as never,
    );
  });

  it('deve chamar CreateAsideExpenseService.createAsideExpense no POST /aside-expenses', () => {
    const dto: CreateAsideExpenseDto = {
      description: 'Reserva de emergencia',
      amount: 500,
      startMonth: '2025-06-15',
    };
    const asideExpense = { id: 'aside-expense-1' };

    createAsideExpenseService.createAsideExpense.mockReturnValue(asideExpense);

    expect(controller.create(request, dto)).toBe(asideExpense);
    expect(
      createAsideExpenseService.createAsideExpense,
    ).toHaveBeenCalledWith('user-1', dto);
  });

  it('deve chamar FindAllAsideExpensesService.findAllAsideExpenses no GET /aside-expenses', () => {
    const asideExpenses = [{ id: 'aside-expense-1' }];

    findAllAsideExpensesService.findAllAsideExpenses.mockReturnValue(
      asideExpenses,
    );

    expect(controller.findAll(request)).toBe(asideExpenses);
    expect(
      findAllAsideExpensesService.findAllAsideExpenses,
    ).toHaveBeenCalledWith('user-1');
  });

  it('deve chamar DeleteAsideExpenseService.deleteAsideExpense no DELETE /aside-expenses/:id', () => {
    const asideExpense = { id: 'aside-expense-1', deletedAt: new Date() };

    deleteAsideExpenseService.deleteAsideExpense.mockReturnValue(asideExpense);

    expect(controller.delete(request, 'aside-expense-1')).toBe(asideExpense);
    expect(
      deleteAsideExpenseService.deleteAsideExpense,
    ).toHaveBeenCalledWith('user-1', 'aside-expense-1');
  });
});
