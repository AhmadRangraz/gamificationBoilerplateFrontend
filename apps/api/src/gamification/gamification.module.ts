import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma.module.js';
import { CommunityController } from './community.controller.js';
import { GamificationController } from './gamification.controller.js';
import { RewardsController } from './rewards.controller.js';
import { EngagementController } from './engagement.controller.js';
import { GamificationAdminController } from './admin.controller.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    GamificationController,
    CommunityController,
    RewardsController,
    EngagementController,
    GamificationAdminController,
  ],
})
export class GamificationModule {}
