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
import { Transform } from 'class-transformer';
import { IsIn, IsISO8601, IsString, Length, Matches } from 'class-validator';
import {
  SameOriginGuard,
  SessionGuard,
  type AuthRequest,
} from '../auth/auth.guards.js';
import { activeAccount } from '../auth/account-transaction.js';
import { PrismaService } from '../prisma.service.js';
import { AppointmentStatus } from '../generated/prisma/client.js';

const nextStatuses = ['CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;
const halfHour = 30 * 60 * 1000;
class ServiceInput {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 100)
  title!: string;
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 1000)
  description!: string;
}
class SlotInput {
  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true })
  @Matches(/Z$/)
  startsAt!: string;
}
class StatusInput {
  @ApiProperty({ enum: nextStatuses })
  @IsIn(nextStatuses)
  status!: (typeof nextStatuses)[number];
}
class SlotView {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'date-time' }) startsAt!: Date;
}
class ServiceView extends ServiceInput {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() provider!: string;
  @ApiProperty() mine!: boolean;
  @ApiProperty({ type: [SlotView] }) slots!: SlotView[];
}
class AppointmentView extends SlotView {
  @ApiProperty() service!: string;
  @ApiProperty() provider!: boolean;
  @ApiProperty({ enum: AppointmentStatus }) status!: AppointmentStatus;
}
class BookingView {
  @ApiProperty({ type: [ServiceView] }) services!: ServiceView[];
  @ApiProperty({ type: [AppointmentView] }) appointments!: AppointmentView[];
}

@ApiTags('booking')
@ApiCookieAuth('session')
@UseGuards(SessionGuard)
@Controller('booking')
export class BookingController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: BookingView })
  async bookingDashboard(@Req() request: AuthRequest): Promise<BookingView> {
    const accountId = request.account.id;
    const [services, appointments] = await this.db.$transaction(
      [
        this.db.serviceOffering.findMany({
          where: { provider: { suspendedAt: null } },
          orderBy: { id: 'asc' },
          take: 20,
          select: {
            id: true,
            title: true,
            description: true,
            providerId: true,
            provider: { select: { name: true } },
            slots: {
              where: { startsAt: { gt: new Date() }, appointment: null },
              orderBy: { startsAt: 'asc' },
              take: 10,
              select: { id: true, startsAt: true },
            },
          },
        }),
        this.db.appointment.findMany({
          where: {
            OR: [
              { customerId: accountId },
              { slot: { service: { providerId: accountId } } },
            ],
          },
          orderBy: [{ slot: { startsAt: 'desc' } }, { id: 'desc' }],
          take: 20,
          select: {
            id: true,
            status: true,
            slot: {
              select: {
                startsAt: true,
                service: { select: { title: true, providerId: true } },
              },
            },
          },
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      services: services.map(({ provider, providerId, ...service }) => ({
        ...service,
        provider: provider.name,
        mine: providerId === accountId,
      })),
      appointments: appointments.map(({ id, status, slot }) => ({
        id,
        status,
        startsAt: slot.startsAt,
        service: slot.service.title,
        provider: slot.service.providerId === accountId,
      })),
    };
  }

  @Post('services')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async offer(@Req() request: AuthRequest, @Body() input: ServiceInput) {
    await this.db.$transaction(async (tx) => {
      const providerId = request.account.id;
      await activeAccount(tx, providerId);
      if ((await tx.serviceOffering.count({ where: { providerId } })) >= 20)
        throw new ConflictException();
      await tx.serviceOffering.create({ data: { ...input, providerId } });
    });
  }

  @Post('services/:id/slots')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async slot(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) serviceId: string,
    @Body() input: SlotInput,
  ) {
    const startsAt = new Date(input.startsAt);
    if (
      !(startsAt > new Date()) ||
      startsAt.getTime() > Date.now() + 90 * 86400000
    )
      throw new ConflictException();
    await this.db.$transaction(async (tx) => {
      const providerId = request.account.id;
      await activeAccount(tx, providerId);
      if (
        !(await tx.serviceOffering.findUnique({
          where: { id: serviceId, providerId },
        }))
      )
        throw new NotFoundException();
      const overlapping = await tx.serviceSlot.findFirst({
        where: {
          service: { providerId },
          startsAt: {
            gt: new Date(startsAt.getTime() - halfHour),
            lt: new Date(startsAt.getTime() + halfHour),
          },
        },
      });
      if (overlapping) throw new ConflictException();
      await tx.serviceSlot.create({ data: { serviceId, startsAt } });
    });
  }

  @Post('slots/:id/reserve')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async reserve(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) slotId: string,
  ) {
    await this.db.$transaction(async (tx) => {
      const customerId = request.account.id;
      await activeAccount(tx, customerId);
      const slot = await tx.serviceSlot.findUnique({
        where: { id: slotId, service: { provider: { suspendedAt: null } } },
        select: { startsAt: true, service: { select: { providerId: true } } },
      });
      if (!slot || slot.service.providerId === customerId)
        throw new NotFoundException();
      const existing = await tx.appointment.findUnique({ where: { slotId } });
      if (existing?.customerId === customerId) return;
      if (slot.startsAt <= new Date()) throw new ConflictException();
      const inserted = await tx.appointment.createMany({
        data: { customerId, slotId },
        skipDuplicates: true,
      });
      if (!inserted.count) throw new ConflictException();
    });
  }

  @Put('appointments/:id')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  async status(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: StatusInput,
  ) {
    const accountId = request.account.id;
    await this.db.$transaction(async (tx) => {
      await activeAccount(tx, accountId);
      const record = await tx.appointment.findUnique({
        where: {
          id,
          OR: [
            { customerId: accountId },
            { slot: { service: { providerId: accountId } } },
          ],
        },
        include: { slot: { include: { service: true } } },
      });
      if (
        !record ||
        (input.status !== 'CANCELLED' &&
          record.slot.service.providerId !== accountId)
      )
        throw new NotFoundException();
      if (record.status === input.status) return;
      const allowed =
        input.status === 'CANCELLED'
          ? ['REQUESTED', 'CONFIRMED'].includes(record.status)
          : input.status === 'CONFIRMED'
            ? record.status === 'REQUESTED' && record.slot.startsAt > new Date()
            : record.status === 'CONFIRMED' &&
              record.slot.startsAt <= new Date();
      if (
        !allowed ||
        !(
          await tx.appointment.updateMany({
            where: { id, status: record.status },
            data: { status: input.status },
          })
        ).count
      )
        throw new ConflictException();
    });
  }
}
