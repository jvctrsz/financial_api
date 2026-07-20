import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CreateCardService } from './services/create-card.service';
import { DeleteCardService } from './services/delete-card.service';
import { FindAllCardsService } from './services/find-all-cards.service';
import { UpdateCardService } from './services/update-card.service';
import { ChangeDefaultCardService } from './services/change-default-card.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

@UseGuards(JwtGuard)
@Controller('cards')
export class CardsController {
  constructor(
    private readonly createCardService: CreateCardService,
    private readonly findAllCardsService: FindAllCardsService,
    private readonly updateCardService: UpdateCardService,
    private readonly deleteCardService: DeleteCardService,
    private readonly changeDefaultCardService: ChangeDefaultCardService,
  ) {}

  @Post()
  @Throttle(WRITE_RATE_LIMIT)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateCardDto) {
    return this.createCardService.createCard(request.user.id, dto);
  }

  @Get()
  @Throttle(READ_RATE_LIMIT)
  findAll(@Req() request: AuthenticatedRequest) {
    return this.findAllCardsService.findAllCards(request.user.id);
  }

  @Patch(':id')
  @Throttle(WRITE_RATE_LIMIT)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') cardId: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.updateCardService.updateCard(request.user.id, cardId, dto);
  }

  @Delete(':id')
  @Throttle(WRITE_RATE_LIMIT)
  delete(@Req() request: AuthenticatedRequest, @Param('id') cardId: string) {
    return this.deleteCardService.deleteCard(request.user.id, cardId);
  }

  @Patch('default/:id')
  @Throttle(WRITE_RATE_LIMIT)
  change(@Req() request: AuthenticatedRequest, @Param('id') cardId: string) {
    return this.changeDefaultCardService.changeDefaultCard(
      request.user.id,
      cardId,
    );
  }
}
