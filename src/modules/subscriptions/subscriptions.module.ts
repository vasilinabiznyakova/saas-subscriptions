import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../users/users.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [DatabaseModule, UsersModule, PricingModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
