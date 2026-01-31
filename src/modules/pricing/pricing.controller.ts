import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PricingResult } from './pricing-result.type';

@UseGuards(JwtAuthGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate')
  calculate(@Body() dto: CalculatePriceDto): Promise<PricingResult> {
    return this.pricingService.calculate(dto);
  }
}
