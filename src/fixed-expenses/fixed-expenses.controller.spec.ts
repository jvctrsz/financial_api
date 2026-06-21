import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';
import { FixedExpensesController } from './fixed-expenses.controller';

describe('FixedExpensesController', () => {
  let createFixedExpenseService: {
    createFixedExpense: jest.Mock;
  };
  let findAllFixedExpensesService: {
    findAllFixedExpenses: jest.Mock;
  };
  let deleteFixedExpenseService: {
    deleteFixedExpense: jest.Mock;
  };
  let controller: FixedExpensesController;

  const request = {
    user: {
      id: 'user-1',
      email: 'user@example.com',
    },
  } as never;

  beforeEach(() => {
    createFixedExpenseService = {
      createFixedExpense: jest.fn(),
    };
    findAllFixedExpensesService = {
      findAllFixedExpenses: jest.fn(),
    };
    deleteFixedExpenseService = {
      deleteFixedExpense: jest.fn(),
    };
    controller = new FixedExpensesController(
      createFixedExpenseService as never,
      findAllFixedExpensesService as never,
      deleteFixedExpenseService as never,
    );
  });

  it('deve chamar CreateFixedExpenseService.createFixedExpense no POST /fixed-expenses', () => {
    const dto: CreateFixedExpenseDto = {
      description: 'Notebook',
      totalAmount: 3000,
      installmentAmount: 300,
      totalInstallments: 10,
      startMonth: '2025-06-01',
      categoryId: 'category-1',
      cardId: 'card-1',
    };
    const fixedExpense = { id: 'fixed-expense-1' };

    createFixedExpenseService.createFixedExpense.mockReturnValue(fixedExpense);

    expect(controller.create(request, dto)).toBe(fixedExpense);
    expect(createFixedExpenseService.createFixedExpense).toHaveBeenCalledWith(
      'user-1',
      dto,
    );
  });

  it('deve chamar FindAllFixedExpensesService.findAllFixedExpenses no GET /fixed-expenses', () => {
    const fixedExpenses = [{ id: 'fixed-expense-1' }];

    findAllFixedExpensesService.findAllFixedExpenses.mockReturnValue(
      fixedExpenses,
    );

    expect(controller.findAll(request)).toBe(fixedExpenses);
    expect(
      findAllFixedExpensesService.findAllFixedExpenses,
    ).toHaveBeenCalledWith('user-1');
  });

  it('deve chamar DeleteFixedExpenseService.deleteFixedExpense no DELETE /fixed-expenses/:id', () => {
    const fixedExpense = { id: 'fixed-expense-1', deletedAt: new Date() };

    deleteFixedExpenseService.deleteFixedExpense.mockReturnValue(fixedExpense);

    expect(controller.delete(request, 'fixed-expense-1')).toBe(fixedExpense);
    expect(deleteFixedExpenseService.deleteFixedExpense).toHaveBeenCalledWith(
      'user-1',
      'fixed-expense-1',
    );
  });
});
