import { forgeConfig, rewardEvents } from '@forge/config';
import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { SessionGuard, type AuthRequest } from '../auth/auth.guards.js';
import { PointEvent, PointOutcome } from '../generated/prisma/client.js';
import { localDay, streaks } from './calendar.js';
import { PrismaService } from '../prisma.service.js';
import { questOccurrence, questWindowStatus } from './quest.js';
import { levelIndex, rewardDiscount } from './balance.js';

const businessEvents = rewardEvents;
const questStatuses = ['UPCOMING', 'ACTIVE', 'COMPLETED', 'EXPIRED'] as const;
const missionStepStatuses = ['LOCKED', 'ACTIVE', 'COMPLETED'] as const;

class PointEntryResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PointEvent })
  event!: PointEvent;

  @ApiProperty({ enum: PointOutcome })
  outcome!: PointOutcome;

  @ApiProperty({ type: 'integer' })
  points!: number;

  @ApiProperty({ type: 'integer' })
  xp!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

class AchievementResponse {
  @ApiProperty({ enum: ['ACTIVITY', 'XP'] })
  kind!: 'ACTIVITY' | 'XP';

  @ApiProperty()
  current!: number;

  @ApiProperty()
  target!: number;

  @ApiProperty()
  unlocked!: boolean;
}

class StreakResponse {
  @ApiProperty()
  current!: number;

  @ApiProperty()
  longest!: number;
}

class StreakDayResponse {
  @ApiProperty({ format: 'date' })
  day!: string;

  @ApiProperty()
  active!: boolean;
}

class QuestResponse {
  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: businessEvents })
  event!: (typeof businessEvents)[number];

  @ApiProperty({ enum: questStatuses })
  status!: (typeof questStatuses)[number];

  @ApiProperty({ enum: ['once', 'daily', 'weekly'] })
  cadence!: 'once' | 'daily' | 'weekly';

  @ApiProperty({ type: String, format: 'date', nullable: true })
  day!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startsAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endsAt!: string | null;

  @ApiProperty({ type: 'integer' })
  current!: number;

  @ApiProperty({ type: 'integer' })
  target!: number;

  @ApiProperty({ type: 'integer' })
  points!: number;

  @ApiProperty({ type: 'integer' })
  xp!: number;
}

class MissionStepResponse {
  @ApiProperty({ enum: businessEvents })
  event!: (typeof businessEvents)[number];

  @ApiProperty({ enum: missionStepStatuses })
  status!: (typeof missionStepStatuses)[number];

  @ApiProperty({ type: 'integer' })
  current!: number;

  @ApiProperty({ type: 'integer' })
  target!: number;
}

class MissionResponse {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  completed!: boolean;

  @ApiProperty({ type: [MissionStepResponse] })
  steps!: MissionStepResponse[];

  @ApiProperty({ type: 'integer' })
  points!: number;

  @ApiProperty({ type: 'integer' })
  xp!: number;
}

class ConfiguredBadge {
  @ApiProperty() key!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: ['activity', 'xp'] }) category!: 'activity' | 'xp';
  @ApiProperty({ enum: ['common', 'rare', 'epic'] }) rarity!:
    'common' | 'rare' | 'epic';
  @ApiProperty() current!: number;
  @ApiProperty() target!: number;
  @ApiProperty() unlocked!: boolean;
}

class ProgressResponse {
  @ApiProperty({ type: [ConfiguredBadge] }) badges!: ConfiguredBadge[];
  @ApiProperty() rewardDiscount!: number;
  @ApiProperty({ type: 'integer' })
  points!: number;

  @ApiProperty({ type: 'integer' })
  xp!: number;

  @ApiProperty({ type: 'integer' })
  level!: number;

  @ApiProperty({ type: 'integer' })
  levelStartAt!: number;

  @ApiProperty({ type: 'integer', nullable: true })
  nextLevelAt!: number | null;

  @ApiProperty({ type: [PointEntryResponse] })
  ledger!: PointEntryResponse[];

  @ApiProperty({ type: [AchievementResponse] })
  achievements!: AchievementResponse[];

  @ApiProperty({ type: StreakResponse })
  daily!: StreakResponse;

  @ApiProperty({ type: StreakResponse })
  weekly!: StreakResponse;

  @ApiProperty({ type: [StreakDayResponse] })
  recentDays!: StreakDayResponse[];

  @ApiProperty()
  leaderboardOptIn!: boolean;

  @ApiProperty({ type: QuestResponse, nullable: true })
  quest!: QuestResponse | null;

  @ApiProperty({ type: MissionResponse, nullable: true })
  mission!: MissionResponse | null;
}

@ApiTags('gamification')
@ApiCookieAuth('session')
@UseGuards(SessionGuard)
@Controller('gamification')
export class GamificationController {
  constructor(private readonly db: PrismaService) {}

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: ProgressResponse })
  async getMyProgress(@Req() request: AuthRequest): Promise<ProgressResponse> {
    const where = { accountId: request.account.id };
    const { quest, mission } = forgeConfig.gamification;
    const now = new Date();
    const today = localDay(now);
    const business = {
      ...where,
      event: { in: [...businessEvents] },
      outcome: 'AWARDED' as const,
    };
    const [totals, ledger, days, count, account] = await this.db.$transaction(
      [
        this.db.pointEntry.aggregate({
          where,
          _sum: { points: true, xp: true },
        }),
        this.db.pointEntry.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 20,
          select: {
            id: true,
            event: true,
            outcome: true,
            points: true,
            xp: true,
            createdAt: true,
          },
        }),
        this.db.pointEntry.groupBy({
          by: ['earnedDay'],
          where: {
            ...business,
            event: { in: forgeConfig.gamification.streakEvents },
          },
          orderBy: { earnedDay: 'asc' },
        }),
        this.db.pointEntry.count({ where: business }),
        this.db.account.findUniqueOrThrow({
          where: { id: request.account.id },
          select: {
            leaderboardOptIn: true,
            streakProtections: { select: { day: true } },
            questProgress: quest
              ? {
                  where: {
                    questKey: quest.key,
                    occurrence: questOccurrence(quest.cadence, today),
                  },
                  select: { count: true, completedAt: true },
                }
              : false,
            missionProgress: mission
              ? {
                  where: { missionKey: mission.key },
                  select: {
                    completedSteps: true,
                    stepCount: true,
                    completedAt: true,
                  },
                }
              : false,
          },
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const xp = totals._sum.xp ?? 0;
    const progress = account.questProgress?.[0];
    const missionProgress = account.missionProgress?.[0];
    const completedSteps = missionProgress?.completedSteps ?? 0;
    const thresholds = forgeConfig.gamification.levelThresholds;
    const index = levelIndex(xp);
    const unlockedBadges = new Set<string>();
    const badges = forgeConfig.gamification.badges.map(
      ({ requires, ...badge }) => {
        const current = badge.category === 'xp' ? xp : count;
        const unlocked =
          current >= badge.target &&
          (!requires || unlockedBadges.has(requires));
        if (unlocked) unlockedBadges.add(badge.key);
        return { ...badge, current, unlocked };
      },
    );
    const achievements: AchievementResponse[] = [];
    const { awardCount, xpMilestone } = forgeConfig.gamification.achievements;
    if (awardCount !== null)
      achievements.push({
        kind: 'ACTIVITY',
        current: count,
        target: awardCount,
        unlocked: count >= awardCount,
      });
    if (xpMilestone !== null)
      achievements.push({
        kind: 'XP',
        current: xp,
        target: xpMilestone,
        unlocked: xp >= xpMilestone,
      });
    return {
      achievements,
      badges,
      rewardDiscount: rewardDiscount(index + 1),
      ...streaks(
        [
          ...days.map(({ earnedDay }) => earnedDay),
          ...account.streakProtections.map(({ day }) => day),
        ],
        today,
      ),
      leaderboardOptIn: account.leaderboardOptIn,
      points: totals._sum.points ?? 0,
      xp,
      level: index + 1,
      levelStartAt: thresholds[index] ?? 0,
      nextLevelAt: thresholds[index + 1] ?? null,
      ledger,
      quest: quest && {
        title: quest.title,
        event: quest.event,
        cadence: quest.cadence,
        status: progress?.completedAt
          ? 'COMPLETED'
          : quest.cadence === 'once'
            ? questWindowStatus(quest, now.getTime())
            : 'ACTIVE',
        day:
          quest.cadence === 'once'
            ? null
            : questOccurrence(quest.cadence, today),
        startsAt: quest.cadence === 'once' ? quest.startsAt : null,
        endsAt: quest.cadence === 'once' ? quest.endsAt : null,
        current: Math.min(progress?.count ?? 0, quest.target),
        target: quest.target,
        ...quest.reward,
      },
      mission: mission && {
        title: mission.title,
        completed: Boolean(missionProgress?.completedAt),
        steps: mission.steps.map(({ event, target }, index) => {
          if (index < completedSteps)
            return { event, target, current: target, status: 'COMPLETED' };
          if (
            index === completedSteps &&
            !missionProgress?.completedAt &&
            (!mission.requiresQuest || progress?.completedAt)
          ) {
            const current = Math.min(missionProgress?.stepCount ?? 0, target);
            return { event, target, current, status: 'ACTIVE' };
          }
          return { event, target, current: 0, status: 'LOCKED' };
        }),
        ...mission.reward,
      },
    };
  }
}
