import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';

import { PricingService } from './pricing.service';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { CalculatePriceResponseDto } from './dto/calculate-price-response.dto';

@ApiTags('pricing')
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'X-Request-Id',
  required: false,
  description:
    'Optional request correlation id. If not provided, it will be generated.',
})
@UseGuards(JwtAuthGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate pricing for a plan and billing period' })
  @ApiOkResponse({ type: CalculatePriceResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  calculate(
    @Body() dto: CalculatePriceDto,
  ): Promise<CalculatePriceResponseDto> {
    return this.pricingService.calculate(dto);
  }
}
