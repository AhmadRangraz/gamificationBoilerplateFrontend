import {
  Controller,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
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
  SameOriginGuard,
  SessionGuard,
  type AuthRequest,
} from '../auth/auth.guards.js';
import { awardBusinessEvent } from '../gamification/award.js';
import { activeAccount } from '../auth/account-transaction.js';
import { PrismaService } from '../prisma.service.js';

class LessonView {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() completed!: boolean;
}
class LessonDetail extends LessonView {
  @ApiProperty() body!: string;
}
class CourseView {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: [LessonView] }) lessons!: LessonView[];
}

@ApiTags('learning')
@ApiCookieAuth('session')
@UseGuards(SessionGuard)
@Controller('learning')
export class LearningController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: [CourseView] })
  async courses(@Req() request: AuthRequest): Promise<CourseView[]> {
    const accountId = request.account.id;
    const courses = await this.db.course.findMany({
      orderBy: { slug: 'asc' },
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        lessons: {
          orderBy: { position: 'asc' },
          take: 50,
          select: {
            id: true,
            title: true,
            completions: { where: { accountId }, select: { id: true } },
          },
        },
      },
    });
    return courses.map(({ lessons, ...course }) => ({
      ...course,
      lessons: lessons.map(({ completions, ...lesson }) => ({
        ...lesson,
        completed: completions.length > 0,
      })),
    }));
  }

  @Get('lessons/:id')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: LessonDetail })
  async lesson(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LessonDetail> {
    const lesson = await this.db.lesson.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        body: true,
        completions: {
          where: { accountId: request.account.id },
          select: { id: true },
        },
      },
    });
    if (!lesson) throw new NotFoundException();
    const { completions, ...detail } = lesson;
    return { ...detail, completed: completions.length > 0 };
  }

  @Post('lessons/:id/complete')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async complete(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) lessonId: string,
  ) {
    const accountId = request.account.id;
    await this.db.$transaction(
      async (tx) => {
        await activeAccount(tx, accountId);
        if (
          !(await tx.lesson.findUnique({
            where: { id: lessonId },
            select: { id: true },
          }))
        )
          throw new NotFoundException();
        const key = { accountId, lessonId };
        if (
          await tx.lessonCompletion.findUnique({
            where: { accountId_lessonId: key },
          })
        )
          return;
        const completion = await tx.lessonCompletion.create({
          data: key,
          select: { id: true },
        });
        await awardBusinessEvent(tx, {
          accountId,
          kind: 'LESSON_COMPLETED',
          completionId: completion.id,
        });
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }
}
