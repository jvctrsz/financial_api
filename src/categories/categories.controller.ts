import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import {
  READ_RATE_LIMIT,
  WRITE_RATE_LIMIT,
} from '../shared/constants/rate-limit.constants';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateCategoryService } from './services/create-category.service';
import { DeleteCategoryService } from './services/delete-category.service';
import { FindAllCategoriesService } from './services/find-all-categories.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtGuard)
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly createCategoryService: CreateCategoryService,
    private readonly findAllCategoriesService: FindAllCategoriesService,
    private readonly deleteCategoryService: DeleteCategoryService,
  ) {}

  @Post()
  @Throttle(WRITE_RATE_LIMIT)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateCategoryDto) {
    return this.createCategoryService.createCategory(request.user.id, dto);
  }

  @Get()
  @Throttle(READ_RATE_LIMIT)
  findAll(@Req() request: AuthenticatedRequest) {
    return this.findAllCategoriesService.findAllCategories(request.user.id);
  }

  @Delete(':id')
  @Throttle(WRITE_RATE_LIMIT)
  delete(
    @Req() request: AuthenticatedRequest,
    @Param('id') categoryId: string,
  ) {
    return this.deleteCategoryService.deleteCategory(
      request.user.id,
      categoryId,
    );
  }
}
