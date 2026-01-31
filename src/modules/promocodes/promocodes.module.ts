import { Module } from '@nestjs/common';
import { PromocodesService } from './promocodes.service';

@Module({
  providers: [PromocodesService],
})
export class PromocodesModule {}
