import { forgeConfig, rewardEvents } from '@forge/config';
import {
  Body,
  ConflictException,
  Controller,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
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
import { IsIn, IsInt, IsUUID, Max, Min } from 'class-validator';
import {
  SameOriginGuard,
  SessionGuard,
  type AuthRequest,
} from '../auth/auth.guards.js';
import { PrismaService } from '../prisma.service.js';
import { activeAccount } from '../auth/account-transaction.js';
import {
  challengeEntryKey,
  grantEngagementReward,
  groupCount,
  requireActiveWindow,
} from './engagement.js';
import { questWindowStatus } from './quest.js';
import { localDay, periodStart, shiftDay } from './calendar.js';
import { pointBalance } from './balance.js';

class ChallengeLeader {
  @ApiProperty() name!: string;
  @ApiProperty() count!: number;
}
class ChallengeView {
  @ApiProperty({ type: [ChallengeLeader] }) leaders!: ChallengeLeader[];
  @ApiProperty() title!: string;
  @ApiProperty({ enum: ['individual', 'group'] }) mode!: 'individual' | 'group';
  @ApiProperty({ enum: ['UPCOMING', 'ACTIVE', 'EXPIRED'] }) status!:
    'UPCOMING' | 'ACTIVE' | 'EXPIRED';
  @ApiProperty({ enum: rewardEvents }) event!: (typeof rewardEvents)[number];
  @ApiProperty() startsAt!: string;
  @ApiProperty() endsAt!: string;
  @ApiProperty() current!: number;
  @ApiProperty() target!: number;
  @ApiProperty() joined!: boolean;
  @ApiProperty() claimable!: boolean;
  @ApiProperty() claimed!: boolean;
}
class ReferralView {
  @ApiProperty({ format: 'uuid' }) accountId!: string;
  @ApiProperty() claimed!: boolean;
}
class ReferralStatus {
  @ApiProperty() code!: string;
  @ApiProperty() canApply!: boolean;
  @ApiProperty({ type: [ReferralView] }) qualified!: ReferralView[];
}
class GoalView {
  @ApiProperty() target!: number;
  @ApiProperty() current!: number;
}
class EngagementView {
  @ApiProperty({ type: 'integer', nullable: true })
  streakProtectionCost!: number | null;
  @ApiProperty({ type: ChallengeView, nullable: true })
  challenge!: ChallengeView | null;
  @ApiProperty({ type: ReferralStatus, nullable: true })
  referral!: ReferralStatus | null;
  @ApiProperty({ type: GoalView, nullable: true }) goal!: GoalView | null;
}
class ReferralInput {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') code!: string;
}
class GoalInput {
  @ApiProperty({ minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  target!: number;
}
class StreakInput {
  @ApiProperty({ enum: ['freeze', 'recover'] })
  @IsIn(['freeze', 'recover'])
  mode!: 'freeze' | 'recover';
}

@ApiTags('gamification')
@ApiCookieAuth('session')
@UseGuards(SessionGuard)
@Controller('gamification/engagement')
export class EngagementController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: EngagementView })
  read(@Req() request: AuthRequest): Promise<EngagementView> {
    const accountId = request.account.id;
    const { challenge, referralReward } = forgeConfig.gamification;
    return this.db.$transaction(
      async (tx) => {
        const entry =
          challenge &&
          (await tx.challengeEntry.findUnique({
            where: challengeEntryKey(accountId, challenge.key),
          }));
        const current =
          challenge?.mode === 'group'
            ? await groupCount(tx, challenge.key)
            : (entry?.count ?? 0);
        const mine =
          referralReward &&
          (await tx.referral.findUnique({ where: { accountId } }));
        const qualified =
          referralReward &&
          (await tx.referral.findMany({
            where: {
              referrerId: accountId,
              qualifiedAt: { not: null },
              claimedAt: null,
            },
            orderBy: [{ qualifiedAt: 'asc' }, { accountId: 'asc' }],
            take: 20,
            select: { accountId: true, claimedAt: true },
          }));
        const goal = await tx.activityGoal.findUnique({ where: { accountId } });
        const leaders =
          challenge &&
          (await tx.challengeEntry.findMany({
            where: {
              challengeKey: challenge.key,
              count: { gt: 0 },
              account: {
                leaderboardOptIn: true,
                leaderboardBanned: false,
                suspendedAt: null,
              },
            },
            orderBy: [{ count: 'desc' }, { accountId: 'asc' }],
            take: 20,
            select: { count: true, account: { select: { name: true } } },
          }));
        return {
          streakProtectionCost: forgeConfig.gamification.streakProtectionCost,
          challenge: challenge && {
            leaders:
              leaders?.map(({ account, count }) => ({
                name: account.name,
                count,
              })) ?? [],
            title: challenge.title,
            mode: challenge.mode,
            event: challenge.event,
            startsAt: challenge.startsAt,
            endsAt: challenge.endsAt,
            status: questWindowStatus(challenge, Date.now()),
            current,
            target: challenge.target,
            joined: Boolean(entry),
            claimable: Boolean(
              entry &&
              entry.count > 0 &&
              current >= challenge.target &&
              !entry.claimedAt,
            ),
            claimed: Boolean(entry?.claimedAt),
          },
          referral: qualified && {
            code: accountId,
            canApply: !mine && !request.account.emailVerified,
            qualified: qualified.map(({ accountId, claimedAt }) => ({
              accountId,
              claimed: Boolean(claimedAt),
            })),
          },
          goal: goal && {
            target: goal.target,
            current: await tx.pointEntry.count({
              where: {
                accountId,
                event: { in: [...rewardEvents] },
                outcome: 'AWARDED',
                createdAt: { gte: goal.startedAt },
              },
            }),
          },
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  @Post('challenge/join')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async join(@Req() request: AuthRequest) {
    const challenge = forgeConfig.gamification.challenge;
    if (!challenge) throw new NotFoundException();
    const accountId = request.account.id;
    await this.db.$transaction(
      async (tx) => {
        await activeAccount(tx, accountId);
        const where = challengeEntryKey(accountId, challenge.key);
        if (await tx.challengeEntry.findUnique({ where })) return;
        const now = new Date();
        requireActiveWindow(challenge, now);
        await tx.challengeEntry.create({
          data: { ...where.accountId_challengeKey, joinedAt: now },
        });
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }

  @Post('challenge/claim')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async claim(@Req() request: AuthRequest) {
    const challenge = forgeConfig.gamification.challenge;
    if (!challenge) throw new NotFoundException();
    const accountId = request.account.id;
    await this.db.$transaction(
      async (tx) => {
        await activeAccount(tx, accountId);
        const where = challengeEntryKey(accountId, challenge.key);
        const entry = await tx.challengeEntry.findUnique({ where });
        if (!entry?.count)
          throw new ConflictException('فعالیت چالش ثبت نشده است.');
        if (entry.claimedAt) return;
        const count =
          challenge.mode === 'group'
            ? await groupCount(tx, challenge.key)
            : entry.count;
        if (count < challenge.target)
          throw new ConflictException('هدف چالش تکمیل نشده است.');
        const now = new Date();
        await grantEngagementReward(
          tx,
          accountId,
          'CHALLENGE_COMPLETED',
          entry.id,
          challenge.reward,
          now,
        );
        await tx.challengeEntry.update({ where, data: { claimedAt: now } });
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }

  @Post('referral')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async apply(@Req() request: AuthRequest, @Body() input: ReferralInput) {
    if (!forgeConfig.gamification.referralReward) throw new NotFoundException();
    const accountId = request.account.id;
    const referrerId = input.code.toLowerCase();
    if (referrerId === accountId)
      throw new ConflictException('معرف باید حساب دیگری باشد.');
    await this.db.$transaction(
      async (tx) => {
        const account = await activeAccount(tx, accountId);
        const previous = await tx.referral.findUnique({ where: { accountId } });
        if (previous?.referrerId === referrerId) return;
        if (account.emailVerified || previous)
          throw new ConflictException('مهلت ثبت معرف پایان یافته است.');
        const referrer = await tx.account.findFirst({
          where: { id: referrerId, suspendedAt: null, emailVerified: true },
          select: { id: true },
        });
        if (!referrer) throw new NotFoundException();
        await tx.referral.create({ data: { accountId, referrerId } });
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }

  @Post('referral/:id/claim')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async claimReferral(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const reward = forgeConfig.gamification.referralReward;
    if (!reward) throw new NotFoundException();
    const referrerId = request.account.id;
    await this.db.$transaction(
      async (tx) => {
        await activeAccount(tx, referrerId);
        const referral = await tx.referral.findUnique({
          where: { accountId: id, referrerId },
        });
        if (!referral?.qualifiedAt) throw new NotFoundException();
        if (referral.claimedAt) return;
        const now = new Date();
        await grantEngagementReward(
          tx,
          referrerId,
          'REFERRAL_COMPLETED',
          id,
          reward,
          now,
        );
        await tx.referral.update({
          where: { accountId: id },
          data: { claimedAt: now },
        });
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }

  @Put('goal')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async goal(@Req() request: AuthRequest, @Body() input: GoalInput) {
    const accountId = request.account.id;
    await this.db.$transaction(async (tx) => {
      await activeAccount(tx, accountId);
      const where = { accountId };
      const data = { target: input.target, startedAt: new Date() };
      await tx.activityGoal.upsert({
        where,
        create: { ...where, ...data },
        update: data,
      });
    });
  }

  @Post('streak')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async protectStreak(@Req() request: AuthRequest, @Body() input: StreakInput) {
    const { streakProtectionCost: cost, streakEvents } =
      forgeConfig.gamification;
    if (cost === null) throw new NotFoundException();
    const accountId = request.account.id;
    await this.db.$transaction(
      async (tx) => {
        await activeAccount(tx, accountId);
        const now = new Date();
        const today = localDay(now);
        const day = input.mode === 'freeze' ? today : shiftDay(today, -1);
        const week = periodStart('weekly', day)!;
        const existing = await tx.streakProtection.findUnique({
          where: { accountId_week: { accountId, week } },
        });
        if (existing?.day === day) return;
        if (existing)
          throw new ConflictException('سهمیهٔ محافظت هفته استفاده شده است.');
        const previous = shiftDay(day, -1);
        const awarded = await tx.pointEntry.findMany({
          where: {
            accountId,
            outcome: 'AWARDED',
            event: { in: streakEvents },
            earnedDay: { in: [day, previous] },
          },
          distinct: ['earnedDay'],
          select: { earnedDay: true },
        });
        const prior =
          awarded.some(({ earnedDay }) => earnedDay === previous) ||
          Boolean(
            await tx.streakProtection.findUnique({
              where: { accountId_day: { accountId, day: previous } },
            }),
          );
        if (
          !prior ||
          awarded.some(({ earnedDay }) => earnedDay === day) ||
          (await pointBalance(tx, accountId)) < cost
        )
          throw new ConflictException('محافظت برای این روز در دسترس نیست.');
        const protection = await tx.streakProtection.create({
          data: { accountId, day, week },
        });
        await tx.pointEntry.create({
          data: {
            accountId,
            event: 'STREAK_PROTECTED',
            sourceId: protection.id,
            outcome: 'AWARDED',
            points: -cost,
            xp: 0,
            earnedDay: today,
            createdAt: now,
          },
        });
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }
}
