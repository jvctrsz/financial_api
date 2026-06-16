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
import { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
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
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateCategoryDto) {
    return this.createCategoryService.createCategory(request.user.id, dto);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.findAllCategoriesService.findAllCategories(request.user.id);
  }

  @Delete(':id')
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
