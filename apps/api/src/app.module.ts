import { forgeConfig } from '@forge/config';
import { Module, type DynamicModule } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma.module.js';
import { PresetsModule } from './presets/presets.module.js';
import { AuthModule } from './auth/auth.module.js';
import { GamificationModule } from './gamification/gamification.module.js';
import { MarketplaceModule } from './marketplace/marketplace.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';

@Module({})
export class AppModule {
  static register(fullContract = false): DynamicModule {
    const { features } = forgeConfig;
    return {
      module: AppModule,
      controllers: [HealthController],
      imports: [
        PrismaModule,
        AuthModule,
        ...(fullContract || features.workspaceAdmin ? [WorkspacesModule] : []),
        ...(fullContract || features.marketplace ? [MarketplaceModule] : []),
        ...(fullContract || features.gamification ? [GamificationModule] : []),
        ...(fullContract ||
        features.booking ||
        features.community ||
        features.learning ||
        features.assistant
          ? [PresetsModule.register(fullContract)]
          : []),
      ],
    };
  }
}
