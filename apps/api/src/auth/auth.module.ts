import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module.js';
import { AccountLifecycleController } from './account-lifecycle.controller.js';
import { AccountLifecycleService } from './account-lifecycle.service.js';
import { AvatarService } from './avatar.service.js';
import { MockMail } from './mock-mail.js';
import { AuthController } from './auth.controller.js';
import { AdminGuard, SameOriginGuard, SessionGuard } from './auth.guards.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController, AccountLifecycleController],
  exports: [SessionGuard, AdminGuard, SameOriginGuard, AuthService],
  providers: [
    AuthService,
    SessionGuard,
    SameOriginGuard,
    AdminGuard,
    AccountLifecycleService,
    MockMail,
    AvatarService,
  ],
})
export class AuthModule {}
