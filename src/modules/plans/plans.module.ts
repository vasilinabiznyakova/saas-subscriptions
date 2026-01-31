import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';

@Module({
  providers: [PlansService],
})
export class PlansModule {}
