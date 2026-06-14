import { Injectable } from '@nestjs/common';
import { todayAsUtcDateOnly } from '../utils/date-only.util';
import { FindCurrentSalaryByDateService } from './find-current-salary-by-date.service';

@Injectable()
export class FindCurrentSalaryService {
  constructor(
    private readonly findCurrentSalaryByDateService: FindCurrentSalaryByDateService,
  ) {}

  findCurrentSalary = async (userId: string) =>
    this.findCurrentSalaryByDateService.findCurrentSalaryByDate(
      userId,
      todayAsUtcDateOnly(),
    );
}
