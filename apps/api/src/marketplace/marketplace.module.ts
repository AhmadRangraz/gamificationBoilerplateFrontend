import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma.module.js';
import { MarketplaceController } from './marketplace.controller.js';
import { ListingsService } from './listings.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MarketplaceController],
  providers: [ListingsService],
})
export class MarketplaceModule {}
