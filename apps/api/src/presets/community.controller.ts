import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { IsBoolean, IsInt, IsString, Length, Max, Min } from 'class-validator';
import {
  SameOriginGuard,
  SessionGuard,
  type AuthRequest,
} from '../auth/auth.guards.js';
import { awardBusinessEvent } from '../gamification/award.js';
import { activeAccount } from '../auth/account-transaction.js';
import { PrismaService } from '../prisma.service.js';

class FeedQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 1000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page = 1;
}
class PostInput {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 2000)
  body!: string;
}
class CommentInput {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 600)
  body!: string;
}
class ReactionInput {
  @ApiProperty() @IsBoolean() active!: boolean;
}
class CommentView {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() author!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}
class PostView extends CommentView {
  @ApiProperty() mine!: boolean;
  @ApiProperty() reacted!: boolean;
  @ApiProperty() reactionCount!: number;
  @ApiProperty({ type: [CommentView] }) comments!: CommentView[];
}
class SocialNotice {
  @ApiProperty() actor!: string;
  @ApiProperty({ enum: ['COMMENT', 'REACTION'] }) kind!: 'COMMENT' | 'REACTION';
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}
class FeedView {
  @ApiProperty({ type: [PostView] }) posts!: PostView[];
  @ApiProperty({ type: [SocialNotice] }) notifications!: SocialNotice[];
  @ApiProperty() hasNext!: boolean;
}

@ApiTags('community')
@ApiCookieAuth('session')
@UseGuards(SessionGuard)
@Controller('community')
export class SocialController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: FeedView })
  async feed(
    @Req() request: AuthRequest,
    @Query() { page }: FeedQuery,
  ): Promise<FeedView> {
    const id = request.account.id;
    const [posts, comments, reactions] = await this.db.$transaction(
      [
        this.db.communityPost.findMany({
          where: { author: { suspendedAt: null } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * 10,
          take: 11,
          select: {
            id: true,
            authorId: true,
            author: { select: { name: true } },
            body: true,
            createdAt: true,
            reactions: {
              where: { accountId: id },
              select: { accountId: true },
            },
            _count: {
              select: {
                reactions: { where: { account: { suspendedAt: null } } },
              },
            },
            comments: {
              where: { author: { suspendedAt: null } },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              take: 5,
              select: {
                id: true,
                author: { select: { name: true } },
                body: true,
                createdAt: true,
              },
            },
          },
        }),
        this.db.communityComment.findMany({
          where: {
            post: { authorId: id },
            author: { suspendedAt: null },
            authorId: { not: id },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 10,
          select: { createdAt: true, author: { select: { name: true } } },
        }),
        this.db.communityReaction.findMany({
          where: {
            post: { authorId: id },
            account: { suspendedAt: null },
            accountId: { not: id },
          },
          orderBy: [
            { createdAt: 'desc' },
            { accountId: 'asc' },
            { postId: 'asc' },
          ],
          take: 10,
          select: { createdAt: true, account: { select: { name: true } } },
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const notifications: SocialNotice[] = [
      ...comments.map(({ author, createdAt }) => ({
        actor: author.name,
        createdAt,
        kind: 'COMMENT' as const,
      })),
      ...reactions.map(({ account, createdAt }) => ({
        actor: account.name,
        createdAt,
        kind: 'REACTION' as const,
      })),
    ];
    return {
      posts: posts
        .slice(0, 10)
        .map(({ author, authorId, comments, reactions, _count, ...post }) => ({
          ...post,
          author: author.name,
          mine: authorId === id,
          reacted: reactions.length > 0,
          reactionCount: _count.reactions,
          comments: comments.reverse().map(({ author, ...comment }) => ({
            ...comment,
            author: author.name,
          })),
        })),
      notifications: notifications
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10),
      hasNext: posts.length > 10 && page < 1000,
    };
  }

  @Post('posts')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async publish(@Req() request: AuthRequest, @Body() input: PostInput) {
    const accountId = request.account.id;
    await this.db.$transaction(
      async (tx) => {
        await activeAccount(tx, accountId);
        const post = await tx.communityPost.create({
          data: { ...input, authorId: accountId },
          select: { id: true },
        });
        await awardBusinessEvent(tx, {
          accountId,
          kind: 'POST_PUBLISHED',
          postId: post.id,
        });
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }

  @Post('posts/:id/comments')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async comment(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) postId: string,
    @Body() input: CommentInput,
  ) {
    const authorId = request.account.id;
    await this.db.$transaction(async (tx) => {
      await activeAccount(tx, authorId);
      if (
        !(await tx.communityPost.findUnique({
          where: { id: postId, author: { suspendedAt: null } },
        }))
      )
        throw new NotFoundException();
      await tx.communityComment.create({
        data: { ...input, postId, authorId },
      });
    });
  }

  @Put('posts/:id/reaction')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async react(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) postId: string,
    @Body() input: ReactionInput,
  ) {
    const accountId = request.account.id;
    await this.db.$transaction(async (tx) => {
      await activeAccount(tx, accountId);
      if (
        !(await tx.communityPost.findUnique({
          where: { id: postId, author: { suspendedAt: null } },
        }))
      )
        throw new NotFoundException();
      const data = { postId, accountId };
      if (input.active)
        await tx.communityReaction.createMany({ data, skipDuplicates: true });
      else await tx.communityReaction.deleteMany({ where: data });
    });
  }

  @Delete('posts/:id')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async removePost(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.db.communityPost.deleteMany({
      where: {
        id,
        authorId: request.account.id,
        author: { suspendedAt: null },
      },
    });
    if (!result.count) throw new NotFoundException();
  }
}
