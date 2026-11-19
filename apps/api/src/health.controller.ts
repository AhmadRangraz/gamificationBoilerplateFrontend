import {
  Controller,
  Get,
  Header,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from './prisma.service.js';

class HealthResponse {
  @ApiProperty({ enum: ['ready', 'unavailable'] })
  status!: 'ready' | 'unavailable';

  @ApiProperty({ enum: ['ready', 'unavailable'] })
  database!: 'ready' | 'unavailable';
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: HealthResponse })
  @ApiServiceUnavailableResponse({ type: HealthResponse })
  async getHealth(): Promise<HealthResponse> {
    try {
      await this.prisma.workspace.findFirst({ select: { id: true } });
    } catch {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        database: 'unavailable',
      } satisfies HealthResponse);
    }

    return { status: 'ready', database: 'ready' };
  }
}
