import { CreateSalaryDto } from './dto/create-salary.dto';
import { SalariesController } from './salaries.controller';

describe('SalariesController', () => {
  let createSalaryService: {
    createSalary: jest.Mock;
  };
  let deleteSalaryService: {
    deleteSalary: jest.Mock;
  };
  let findAllSalariesService: {
    findAllSalaries: jest.Mock;
  };
  let findCurrentSalaryService: {
    findCurrentSalary: jest.Mock;
  };
  let controller: SalariesController;

  const request = {
    user: {
      id: 'user-1',
      email: 'user@example.com',
    },
  } as never;

  beforeEach(() => {
    createSalaryService = {
      createSalary: jest.fn(),
    };
    deleteSalaryService = {
      deleteSalary: jest.fn(),
    };
    findAllSalariesService = {
      findAllSalaries: jest.fn(),
    };
    findCurrentSalaryService = {
      findCurrentSalary: jest.fn(),
    };
    controller = new SalariesController(
      createSalaryService as never,
      deleteSalaryService as never,
      findAllSalariesService as never,
      findCurrentSalaryService as never,
    );
  });

  it('deve chamar CreateSalaryService.createSalary no POST /salaries', () => {
    const dto: CreateSalaryDto = {
      amount: 5000,
      paidAt: '2025-06-06',
    };
    const result = { salary: { id: 'salary-1' } };

    createSalaryService.createSalary.mockReturnValue(result);

    expect(controller.create(request, dto)).toBe(result);
    expect(createSalaryService.createSalary).toHaveBeenCalledWith(
      'user-1',
      dto,
    );
  });

  it('deve chamar FindAllSalariesService.findAllSalaries no GET /salaries', () => {
    const salaries = [{ id: 'salary-1' }];

    findAllSalariesService.findAllSalaries.mockReturnValue(salaries);

    expect(controller.findAll(request)).toBe(salaries);
    expect(findAllSalariesService.findAllSalaries).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('deve chamar FindCurrentSalaryService.findCurrentSalary no GET /salaries/current', () => {
    const salary = { id: 'salary-current' };

    findCurrentSalaryService.findCurrentSalary.mockReturnValue(salary);

    expect(controller.findCurrent(request)).toBe(salary);
    expect(findCurrentSalaryService.findCurrentSalary).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('deve chamar DeleteSalaryService.deleteSalary no DELETE /salaries/:id', () => {
    const salary = { id: 'salary-1' };

    deleteSalaryService.deleteSalary.mockReturnValue(salary);

    expect(controller.delete(request, 'salary-1')).toBe(salary);
    expect(deleteSalaryService.deleteSalary).toHaveBeenCalledWith(
      'user-1',
      'salary-1',
    );
  });
});
