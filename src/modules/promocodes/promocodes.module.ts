import { Module } from '@nestjs/common';
import { PromocodesController } from './promocodes.controller';
import { PromocodesService } from './promocodes.service';

@Module({
  controllers: [PromocodesController],
  providers: [PromocodesService]
})
export class PromocodesModule {}
