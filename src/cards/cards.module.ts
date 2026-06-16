import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CardsController } from './cards.controller';
import { CreateCardService } from './services/create-card.service';
import { DeleteCardService } from './services/delete-card.service';
import { FindAllCardsService } from './services/find-all-cards.service';
import { UpdateCardService } from './services/update-card.service';
import { ChangeDefaultCardService } from './services/change-default-card.service';

const cardServices = [
  CreateCardService,
  FindAllCardsService,
  UpdateCardService,
  DeleteCardService,
  ChangeDefaultCardService,
];

@Module({
  imports: [PrismaModule],
  controllers: [CardsController],
  providers: cardServices,
  exports: cardServices,
})
export class CardsModule {}
