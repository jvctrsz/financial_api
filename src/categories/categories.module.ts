import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriesController } from './categories.controller';
import { CreateCategoryService } from './services/create-category.service';
import { DeleteCategoryService } from './services/delete-category.service';
import { FindAllCategoriesService } from './services/find-all-categories.service';

const categoryServices = [
  CreateCategoryService,
  FindAllCategoriesService,
  DeleteCategoryService,
];

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: categoryServices,
  exports: categoryServices,
})
export class CategoriesModule {}
