import { forgeConfig } from '@forge/config';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsUUID, Matches } from 'class-validator';
import {
  SameOriginGuard,
  SessionGuard,
  type AuthRequest,
} from '../auth/auth.guards.js';
import { PrismaService } from '../prisma.service.js';
import { accountDiscount, discountedCost, pointBalance } from './balance.js';
import { redeemReward, redemptionFields } from './redemptions.js';

class RewardItemResponse {
  @ApiProperty()
  key!: string;
  @ApiProperty()
  title!: string;
  @ApiProperty()
  description!: string;
  @ApiProperty({ type: 'integer' })
  cost!: number;
}

class RedemptionResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  rewardKey!: string;
  @ApiProperty()
  title!: string;
  @ApiProperty({ type: 'integer' })
  cost!: number;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

class RewardsResponse {
  @ApiProperty({ type: 'integer' })
  balance!: number;
  @ApiProperty({ type: [RewardItemResponse] })
  rewards!: RewardItemResponse[];
  @ApiProperty({ type: [RedemptionResponse] })
  redemptions!: RedemptionResponse[];
}

class RedemptionInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  requestId!: string;

  @ApiProperty({ minLength: 1, maxLength: 64 })
  @Matches(/^[a-z0-9][a-z0-9-]{0,63}$/)
  rewardKey!: string;
}

@ApiTags('gamification')
@ApiCookieAuth('session')
@UseGuards(SessionGuard)
@Controller('gamification/rewards')
export class RewardsController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: RewardsResponse })
  list(@Req() request: AuthRequest): Promise<RewardsResponse> {
    const accountId = request.account.id;
    return this.db.$transaction(
      async (tx) => {
        const discount = await accountDiscount(tx, accountId);
        const costs = new Map(
          (
            await tx.gamificationControl.findMany({
              where: { key: { startsWith: 'reward:' } },
            })
          ).map(({ key, value }) => [key, value]),
        );
        return {
          balance: await pointBalance(tx, accountId),
          rewards: forgeConfig.gamification.rewards
            .map((reward) => ({
              ...reward,
              cost: discountedCost(
                costs.get(`reward:${reward.key}`) ?? reward.cost,
                discount,
              ),
            }))
            .filter(({ cost }) => cost > 0),
          redemptions: await tx.rewardRedemption.findMany({
            where: { accountId },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 20,
            select: redemptionFields,
          }),
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  @Post('redemptions')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @UseGuards(SameOriginGuard)
  @ApiOkResponse({ type: RedemptionResponse })
  redeem(
    @Req() request: AuthRequest,
    @Body() input: RedemptionInput,
  ): Promise<RedemptionResponse> {
    return this.db.$transaction(
      (tx) => redeemReward(tx, request.account.id, input),
      { isolationLevel: 'ReadCommitted' },
    );
  }
}
