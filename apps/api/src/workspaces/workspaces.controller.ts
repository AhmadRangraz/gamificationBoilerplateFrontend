import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  AdminGuard,
  SameOriginGuard,
  SessionGuard,
} from '../auth/auth.guards.js';
import { WorkspacesService } from './workspaces.service.js';

export class WorkspaceInput {
  @ApiProperty({ minLength: 1, maxLength: 160 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'نام معتبر نیست.' })
  @MinLength(1, { message: 'نام را وارد کنید.' })
  @MaxLength(160, { message: 'نام بیش از حد طولانی است.' })
  name!: string;

  @ApiProperty({ maxLength: 64, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' })
  @MaxLength(64, { message: 'شناسه بیش از حد طولانی است.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'از حروف کوچک انگلیسی، رقم یا خط تیره استفاده کنید.',
  })
  slug!: string;
}

class WorkspaceResponse extends WorkspaceInput {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

class WorkspacePage {
  @ApiProperty({ type: [WorkspaceResponse] })
  items!: WorkspaceResponse[];

  @ApiProperty()
  hasNext!: boolean;
}

@ApiTags('workspaces')
@ApiCookieAuth('session')
@UseGuards(SessionGuard, AdminGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiOkResponse({ type: WorkspacePage })
  listWorkspaces(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    if (page < 1 || page > 500)
      throw new BadRequestException('شمارهٔ صفحه معتبر نیست.');
    return this.workspaces.list(page);
  }

  @Post()
  @UseGuards(SameOriginGuard)
  @ApiCreatedResponse({ type: WorkspaceResponse })
  createWorkspace(@Body() input: WorkspaceInput) {
    return this.workspaces.save(input);
  }

  @Patch(':id')
  @UseGuards(SameOriginGuard)
  @ApiOkResponse({ type: WorkspaceResponse })
  updateWorkspace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: WorkspaceInput,
  ) {
    return this.workspaces.save(input, id);
  }

  @Delete(':id')
  @UseGuards(SameOriginGuard)
  @HttpCode(204)
  @ApiNoContentResponse()
  deleteWorkspace(@Param('id', ParseUUIDPipe) id: string) {
    return this.workspaces.remove(id);
  }
}
