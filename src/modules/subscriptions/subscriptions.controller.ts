import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';
import { IdempotencyKey } from '../../common/decorators/idempotency-key.decorator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth.types';

type AuthedRequest = Request & { user: AuthUser };

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  create(
    @Req() req: AuthedRequest,
    @Body() dto: CreateSubscriptionDto,
    @IdempotencyKey() idempotencyKey: string,
  ): ReturnType<SubscriptionsService['create']> {
    return this.subscriptionsService.create(dto, idempotencyKey, req.user.id);
  }

  @Get()
  findAll(
    @Req() req: AuthedRequest,
  ): ReturnType<SubscriptionsService['findAll']> {
    return this.subscriptionsService.findAll(req.user.id);
  }

  @Get(':id')
  findById(
    @Req() req: AuthedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): ReturnType<SubscriptionsService['findById']> {
    return this.subscriptionsService.findById(id, req.user.id);
  }
}
