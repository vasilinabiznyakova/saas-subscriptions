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

import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateSubscriptionResponseDto } from './dto/create-subscription-response.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';

import { SubscriptionsService } from './subscriptions.service';
import { IdempotencyKey } from '../../common/decorators/idempotency-key.decorator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth.types';

type AuthedRequest = Request & { user: AuthUser };

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create subscription (idempotent)' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique key for safe retries',
  })
  @ApiCreatedResponse({
    description: 'Subscription created',
    type: CreateSubscriptionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Req() req: AuthedRequest,
    @Body() dto: CreateSubscriptionDto,
    @IdempotencyKey() idempotencyKey: string,
  ): ReturnType<SubscriptionsService['create']> {
    return this.subscriptionsService.create(dto, idempotencyKey, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List user subscriptions' })
  @ApiOkResponse({
    description: 'OK',
    type: SubscriptionResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Req() req: AuthedRequest,
  ): ReturnType<SubscriptionsService['findAll']> {
    return this.subscriptionsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: 'OK',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findById(
    @Req() req: AuthedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): ReturnType<SubscriptionsService['findById']> {
    return this.subscriptionsService.findById(id, req.user.id);
  }
}
