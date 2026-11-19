import { forgeConfig } from '@forge/config';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
} from 'class-validator';
import {
  AdminGuard,
  SameOriginGuard,
  SessionGuard,
  type AuthRequest,
} from '../auth/auth.guards.js';
import { PrismaService } from '../prisma.service.js';
import { adjustPoints } from './adjustments.js';
import { localDay, periodStart } from './calendar.js';

const periods = ['daily', 'weekly', 'monthly', 'all', 'season'] as const;

class RankingQuery {
  @ApiPropertyOptional({ enum: periods, default: 'all' })
  @IsIn(periods)
  period: (typeof periods)[number] = 'all';

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  page = 1;
}

class RankingRow {
  @ApiProperty()
  rank!: number;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  xp!: number;
  @ApiProperty()
  isMe!: boolean;
}

class RankingPage {
  @ApiProperty({ type: [RankingRow] })
  rows!: RankingRow[];
  @ApiProperty({ type: 'integer', nullable: true })
  myRank!: number | null;
  @ApiProperty()
  hasNext!: boolean;
}

class RankingPreference {
  @ApiProperty()
  @IsBoolean()
  leaderboardOptIn!: boolean;
}

class AdjustmentInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  requestId!: string;

  @ApiProperty({ type: 'integer', minimum: -1000, maximum: 1000 })
  @IsInt()
  @Min(-1000)
  @Max(1000)
  @NotEquals(0)
  points!: number;

  @ApiProperty({ minLength: 1, maxLength: 240 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  reason!: string;
}

@ApiTags('gamification')
@ApiCookieAuth('session')
@UseGuards(SessionGuard)
@Controller('gamification')
export class CommunityController {
  constructor(private readonly db: PrismaService) {}

  @Get('leaderboard')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: RankingPage })
  async leaderboard(
    @Query() { period, page }: RankingQuery,
    @Req() request: AuthRequest,
  ): Promise<RankingPage> {
    const today = localDay(new Date());
    const start = periodStart(period === 'season' ? 'all' : period, today);
    const season = period === 'season' ? forgeConfig.gamification.season : null;
    if (period === 'season' && !season)
      return { rows: [], myRank: null, hasNext: false };
    const seasonStart = season ? new Date(season.startsAt) : null;
    const seasonEnd = season
      ? new Date(Math.min(Date.parse(season.endsAt), Date.now()))
      : null;
    const accountId = request.account.id;
    const size = 20;
    const [result] = await this.db.$queryRaw<
      { rows: RankingRow[]; myRank: number | null }[]
    >`
      WITH scores AS (
        SELECT a.id, a.name, SUM(p.xp) AS xp
        FROM "Account" a JOIN "PointEntry" p ON p."accountId" = a.id
        WHERE a."leaderboardOptIn" AND NOT a."leaderboardBanned" AND a."suspendedAt" IS NULL
          AND p.outcome = 'AWARDED' AND p.xp > 0
          AND p."earnedDay" <= ${today}
          AND (${start}::text IS NULL OR p."earnedDay" >= ${start}::text)
          AND (${seasonStart}::timestamptz IS NULL OR p."createdAt" >= ${seasonStart}::timestamptz)
          AND (${seasonEnd}::timestamptz IS NULL OR p."createdAt" < ${seasonEnd}::timestamptz)
        GROUP BY a.id, a.name
      ), ranked AS (
        SELECT *, RANK() OVER (ORDER BY xp DESC) AS rank FROM scores
      )
      SELECT
        (SELECT COALESCE(json_agg(
          json_build_object('rank', r.rank, 'name', r.name, 'xp', r.xp, 'isMe', r.id = ${accountId}::uuid)
          ORDER BY r.xp DESC, r.id ASC
        ), '[]'::json) FROM (
          SELECT * FROM ranked ORDER BY xp DESC, id ASC LIMIT ${size + 1} OFFSET ${(page - 1) * size}
        ) r) AS rows,
        (SELECT rank::int FROM ranked WHERE id = ${accountId}::uuid) AS "myRank"
    `;
    return {
      rows: result?.rows.slice(0, size) ?? [],
      myRank: result?.myRank ?? null,
      hasNext: page < 500 && (result?.rows.length ?? 0) > size,
    };
  }

  @Patch('preferences')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async setRankingPreference(
    @Body() body: RankingPreference,
    @Req() request: AuthRequest,
  ) {
    await this.db.account.update({
      where: { id: request.account.id },
      data: { leaderboardOptIn: body.leaderboardOptIn },
    });
  }

  @Post('accounts/:id/adjustments')
  @HttpCode(204)
  @UseGuards(AdminGuard, SameOriginGuard)
  @ApiNoContentResponse()
  grantAdjustment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdjustmentInput,
    @Req() request: AuthRequest,
  ) {
    return adjustPoints(this.db, request.account.id, id, body);
  }
}
