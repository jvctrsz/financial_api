import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { SalariesService } from './salaries.service';

const temporaryUserId = '00000000-0000-0000-0000-000000000000';

@Controller('salaries')
export class SalariesController {
  constructor(private readonly salariesService: SalariesService) {}

  @Post()
  create(@Body() dto: CreateSalaryDto) {
    return this.salariesService.create(temporaryUserId, dto);
  }

  @Get()
  findAll() {
    return this.salariesService.findAll(temporaryUserId);
  }

  @Get('current')
  findCurrent() {
    return this.salariesService.findCurrent(temporaryUserId);
  }
}
