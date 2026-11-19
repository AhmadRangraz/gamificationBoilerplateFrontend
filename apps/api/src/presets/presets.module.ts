import { forgeConfig } from '@forge/config';
import { Module, type DynamicModule } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma.module.js';
import { AssistantController } from './assistant.controller.js';
import { BookingController } from './booking.controller.js';
import { SocialController } from './community.controller.js';
import { LearningController } from './learning.controller.js';

@Module({})
export class PresetsModule {
  static register(fullContract: boolean): DynamicModule {
    const { features } = forgeConfig;
    return {
      module: PresetsModule,
      imports: [AuthModule, PrismaModule],
      controllers: [
        ...(fullContract || features.booking ? [BookingController] : []),
        ...(fullContract || features.community ? [SocialController] : []),
        ...(fullContract || features.learning ? [LearningController] : []),
        ...(fullContract || features.assistant ? [AssistantController] : []),
      ],
    };
  }
}
