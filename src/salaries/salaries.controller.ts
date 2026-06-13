import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { CreateSalaryService } from './services/create-salary.service';
import { FindAllSalariesService } from './services/find-all-salaries.service';
import { FindCurrentSalaryService } from './services/find-current-salary.service';

const temporaryUserId = '00000000-0000-0000-0000-000000000000';

@Controller('salaries')
export class SalariesController {
  constructor(
    private readonly createSalaryService: CreateSalaryService,
    private readonly findAllSalariesService: FindAllSalariesService,
    private readonly findCurrentSalaryService: FindCurrentSalaryService,
  ) {}

  @Post()
  create(@Body() dto: CreateSalaryDto) {
    return this.createSalaryService.execute(temporaryUserId, dto);
  }

  @Get()
  findAll() {
    return this.findAllSalariesService.execute(temporaryUserId);
  }

  @Get('current')
  findCurrent() {
    return this.findCurrentSalaryService.execute(temporaryUserId);
  }
}
