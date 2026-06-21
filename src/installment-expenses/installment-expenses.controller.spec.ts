import { CreateInstallmentExpenseDto } from './dto/create-installment-expense.dto';
import { InstallmentExpensesController } from './installment-expenses.controller';

describe('InstallmentExpensesController', () => {
  let createInstallmentExpenseService: {
    createInstallmentExpense: jest.Mock;
  };
  let findAllInstallmentExpensesService: {
    findAllInstallmentExpenses: jest.Mock;
  };
  let deleteInstallmentExpenseService: {
    deleteInstallmentExpense: jest.Mock;
  };
  let controller: InstallmentExpensesController;

  const request = {
    user: {
      id: 'user-1',
      email: 'user@example.com',
    },
  } as never;

  beforeEach(() => {
    createInstallmentExpenseService = {
      createInstallmentExpense: jest.fn(),
    };
    findAllInstallmentExpensesService = {
      findAllInstallmentExpenses: jest.fn(),
    };
    deleteInstallmentExpenseService = {
      deleteInstallmentExpense: jest.fn(),
    };
    controller = new InstallmentExpensesController(
      createInstallmentExpenseService as never,
      findAllInstallmentExpensesService as never,
      deleteInstallmentExpenseService as never,
    );
  });

  it('deve chamar CreateInstallmentExpenseService.createInstallmentExpense no POST /installment-expenses', () => {
    const dto: CreateInstallmentExpenseDto = {
      description: 'Notebook',
      totalAmount: 3000,
      installmentAmount: 300,
      totalInstallments: 10,
      startMonth: '2025-06-01',
      categoryId: 'category-1',
      cardId: 'card-1',
    };
    const installmentExpense = { id: 'installment-expense-1' };

    createInstallmentExpenseService.createInstallmentExpense.mockReturnValue(
      installmentExpense,
    );

    expect(controller.create(request, dto)).toBe(installmentExpense);
    expect(
      createInstallmentExpenseService.createInstallmentExpense,
    ).toHaveBeenCalledWith('user-1', dto);
  });

  it('deve chamar FindAllInstallmentExpensesService.findAllInstallmentExpenses no GET /installment-expenses', () => {
    const installmentExpenses = [{ id: 'installment-expense-1' }];

    findAllInstallmentExpensesService.findAllInstallmentExpenses.mockReturnValue(
      installmentExpenses,
    );

    expect(controller.findAll(request)).toBe(installmentExpenses);
    expect(
      findAllInstallmentExpensesService.findAllInstallmentExpenses,
    ).toHaveBeenCalledWith('user-1');
  });

  it('deve chamar DeleteInstallmentExpenseService.deleteInstallmentExpense no DELETE /installment-expenses/:id', () => {
    const installmentExpense = {
      id: 'installment-expense-1',
      deletedAt: new Date(),
    };

    deleteInstallmentExpenseService.deleteInstallmentExpense.mockReturnValue(
      installmentExpense,
    );

    expect(controller.delete(request, 'installment-expense-1')).toBe(
      installmentExpense,
    );
    expect(
      deleteInstallmentExpenseService.deleteInstallmentExpense,
    ).toHaveBeenCalledWith('user-1', 'installment-expense-1');
  });
});
