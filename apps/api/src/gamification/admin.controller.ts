import { forgeConfig } from '@forge/config';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AdminGuard,
  SameOriginGuard,
  SessionGuard,
  type AuthRequest,
} from '../auth/auth.guards.js';
import { lockAccount } from '../auth/account-transaction.js';
import { PrismaService } from '../prisma.service.js';

class ControlInput {
  @ApiProperty() @IsString() @MaxLength(80) key!: string;
  @ApiProperty() @IsInt() @Min(0) @Max(1_000_000) value!: number;
}
class RankingModeration {
  @ApiProperty() @IsBoolean() excluded!: boolean;
}
class AuditView extends ControlInput {
  @ApiProperty() actorId!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}
class CapSignal {
  @ApiProperty() accountId!: string;
  @ApiProperty() count!: number;
}
class AdminReport {
  @ApiProperty({ type: [CapSignal] }) capSignals!: CapSignal[];
  @ApiProperty({ type: [ControlInput] }) controls!: ControlInput[];
  @ApiProperty({ type: [AuditView] }) audit!: AuditView[];
  @ApiProperty() participants!: number;
  @ApiProperty() cappedEvents!: number;
  @ApiProperty() challengeEntries!: number;
  @ApiProperty() rewardRedemptions!: number;
  @ApiProperty() verifiedReferrals!: number;
}

function defaultControls() {
  const { rules, rewards } = forgeConfig.gamification;
  return new Map<string, number>([
    ...(rules.emailVerified
      ? [['cap:EMAIL_VERIFIED', rules.emailVerified.dailyLimit] as const]
      : []),
    ...(forgeConfig.features.marketplace && rules.listingPublished
      ? [['cap:LISTING_PUBLISHED', rules.listingPublished.dailyLimit] as const]
      : []),
    ...(forgeConfig.features.community && rules.postPublished
      ? [['cap:POST_PUBLISHED', rules.postPublished.dailyLimit] as const]
      : []),
    ...(forgeConfig.features.learning && rules.lessonCompleted
      ? [['cap:LESSON_COMPLETED', rules.lessonCompleted.dailyLimit] as const]
      : []),
    ...rewards.map(({ key, cost }) => [`reward:${key}`, cost] as const),
  ]);
}

@ApiTags('gamification')
@ApiCookieAuth('session')
@UseGuards(SessionGuard, AdminGuard)
@Controller('gamification/admin')
export class GamificationAdminController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AdminReport })
  async report(): Promise<AdminReport> {
    const [
      settings,
      audit,
      participants,
      cappedEvents,
      challengeEntries,
      rewardRedemptions,
      verifiedReferrals,
      signals,
    ] = await this.db.$transaction(
      [
        this.db.gamificationControl.findMany(),
        this.db.gamificationAudit.findMany({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 20,
          select: { key: true, value: true, actorId: true, createdAt: true },
        }),
        this.db.account.count({
          where: { pointLedger: { some: { outcome: 'AWARDED' } } },
        }),
        this.db.pointEntry.count({ where: { outcome: 'CAPPED' } }),
        this.db.challengeEntry.count(),
        this.db.rewardRedemption.count(),
        this.db.referral.count({ where: { qualifiedAt: { not: null } } }),
        this.db.$queryRaw<CapSignal[]>`
          SELECT "accountId", count(*)::int AS count
          FROM "PointEntry" WHERE outcome = 'CAPPED'
          GROUP BY "accountId" ORDER BY count(*) DESC, "accountId" ASC LIMIT 20
        `,
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const values = new Map(settings.map(({ key, value }) => [key, value]));
    const controls = Array.from(defaultControls(), ([key, fallback]) => ({
      key,
      value: values.get(key) ?? fallback,
    }));
    return {
      controls,
      audit,
      participants,
      cappedEvents,
      challengeEntries,
      rewardRedemptions,
      verifiedReferrals,
      capSignals: signals,
    };
  }

  @Put('controls')
  @UseGuards(SameOriginGuard)
  @HttpCode(204)
  @ApiNoContentResponse()
  async configure(
    @Req() request: AuthRequest,
    @Body() { key, value }: ControlInput,
  ) {
    if (!defaultControls().has(key) || (key.startsWith('cap:') && value > 100))
      throw new NotFoundException('تنظیم معتبر نیست.');
    await this.db.$transaction([
      this.db.gamificationControl.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
      this.db.gamificationAudit.create({
        data: { actorId: request.account.id, key, value },
      }),
    ]);
  }

  @Put('ranking/:id')
  @UseGuards(SameOriginGuard)
  @HttpCode(204)
  @ApiNoContentResponse()
  async moderate(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RankingModeration,
  ) {
    await this.db.$transaction(async (tx) => {
      const account = await lockAccount(tx, id);
      if (!account) throw new NotFoundException();
      if (account.leaderboardBanned === body.excluded) return;
      await tx.account.update({
        where: { id },
        data: { leaderboardBanned: body.excluded },
      });
      await tx.gamificationAudit.create({
        data: {
          actorId: request.account.id,
          key: `ranking:${id}`,
          value: Number(body.excluded),
        },
      });
    });
  }
}
