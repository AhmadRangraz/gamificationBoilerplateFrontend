import { Readable } from 'node:stream';
import { setTimeout } from 'node:timers/promises';
import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsUUID, Length } from 'class-validator';
import {
  SameOriginGuard,
  SessionGuard,
  type AuthRequest,
} from '../auth/auth.guards.js';
import { activeAccount } from '../auth/account-transaction.js';
import { PrismaService } from '../prisma.service.js';
import { localAssistant } from './mock-assistant.js';

class ConversationInput {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 100)
  title!: string;
}
class TurnInput {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') requestId!: string;
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 1000)
  prompt!: string;
}
class ConversationView extends ConversationInput {
  @ApiProperty({ format: 'uuid' }) id!: string;
}
class TurnView {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() prompt!: string;
  @ApiProperty() reply!: string;
  @ApiProperty() topic!: string;
}
const turnFields = {
  id: true,
  prompt: true,
  reply: true,
  topic: true,
} as const;

async function* replyStream(turn: TurnView) {
  for (const delta of turn.reply.match(/\S+\s*/gu) ?? []) {
    yield JSON.stringify({ type: 'delta', delta }) + '\n';
    await setTimeout(12);
  }
  yield JSON.stringify({ type: 'complete', turn }) + '\n';
}

@ApiTags('assistant')
@ApiCookieAuth('session')
@UseGuards(SessionGuard)
@Controller('assistant/conversations')
export class AssistantController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: [ConversationView] })
  listConversations(@Req() request: AuthRequest): Promise<ConversationView[]> {
    return this.db.conversation.findMany({
      where: { accountId: request.account.id },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 20,
      select: { id: true, title: true },
    });
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: [TurnView] })
  async history(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TurnView[]> {
    const conversation = await this.db.conversation.findUnique({
      where: { id, accountId: request.account.id },
      select: {
        turns: { orderBy: { position: 'asc' }, take: 50, select: turnFields },
      },
    });
    if (!conversation) throw new NotFoundException();
    return conversation.turns;
  }

  @Post()
  @HttpCode(200)
  @UseGuards(SameOriginGuard)
  @ApiOkResponse({ type: ConversationView })
  async create(
    @Req() request: AuthRequest,
    @Body() input: ConversationInput,
  ): Promise<ConversationView> {
    return this.db.$transaction(
      async (tx) => {
        const accountId = request.account.id;
        await activeAccount(tx, accountId);
        if ((await tx.conversation.count({ where: { accountId } })) >= 20)
          throw new ConflictException();
        return tx.conversation.create({
          data: { ...input, accountId },
          select: { id: true, title: true },
        });
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }

  @Post(':id/turns')
  @HttpCode(200)
  @UseGuards(SameOriginGuard)
  @Header('Cache-Control', 'no-store')
  @Header('X-Accel-Buffering', 'no')
  @ApiOkResponse({
    content: { 'application/x-ndjson': { schema: { type: 'string' } } },
  })
  async message(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body() input: TurnInput,
  ): Promise<StreamableFile> {
    const accountId = request.account.id;
    const turn = await this.db.$transaction(
      async (tx) => {
        await activeAccount(tx, accountId);
        if (
          !(await tx.conversation.findUnique({
            where: { id: conversationId, accountId },
            select: { id: true },
          }))
        )
          throw new NotFoundException();
        const key = { conversationId, requestId: input.requestId };
        const previous = await tx.conversationTurn.findUnique({
          where: { conversationId_requestId: key },
          select: turnFields,
        });
        if (previous) {
          if (previous.prompt !== input.prompt) throw new ConflictException();
          return previous;
        }
        const position = await tx.conversationTurn.count({
          where: { conversationId },
        });
        if (position >= 50) throw new ConflictException();
        const result = await localAssistant.reply(input.prompt, position);
        const record = await tx.conversationTurn.create({
          data: { ...key, prompt: input.prompt, position, ...result },
          select: turnFields,
        });
        await tx.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
        return record;
      },
      { isolationLevel: 'ReadCommitted' },
    );
    return new StreamableFile(Readable.from(replyStream(turn)), {
      type: 'application/x-ndjson; charset=utf-8',
    });
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async removeConversation(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.db.$transaction(async (tx) => {
      const accountId = request.account.id;
      await activeAccount(tx, accountId);
      if (
        !(await tx.conversation.deleteMany({ where: { id, accountId } })).count
      )
        throw new NotFoundException();
    });
  }
}
