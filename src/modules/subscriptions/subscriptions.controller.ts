import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';
import { IdempotencyKey } from '../../common/decorators/idempotency-key.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  create(
    @Body() dto: CreateSubscriptionDto,
    @IdempotencyKey() idempotencyKey: string,
  ): ReturnType<SubscriptionsService['create']> {
    return this.subscriptionsService.create(dto, idempotencyKey);
  }

  @Get()
  findAll(
    @Query('userId', new ParseUUIDPipe()) userId: string,
  ): ReturnType<SubscriptionsService['findAll']> {
    return this.subscriptionsService.findAll(userId);
  }

  @Get(':id')
  findById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('userId', new ParseUUIDPipe()) userId: string,
  ): ReturnType<SubscriptionsService['findById']> {
    return this.subscriptionsService.findById(id, userId);
  }
}
