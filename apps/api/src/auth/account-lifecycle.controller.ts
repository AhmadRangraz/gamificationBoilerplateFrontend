import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccountLifecycleService } from './account-lifecycle.service.js';
import {
  AccountCodeDto,
  AccountStatusDto,
  AvatarDto,
  EmailDto,
  ResetPasswordDto,
} from './auth.dto.js';
import {
  AdminGuard,
  SameOriginGuard,
  SessionGuard,
  type AuthRequest,
} from './auth.guards.js';
import { AvatarService } from './avatar.service.js';

@ApiTags('account lifecycle')
@Controller('auth')
export class AccountLifecycleController {
  constructor(
    private readonly lifecycle: AccountLifecycleService,
    private readonly avatars: AvatarService,
  ) {}

  @Post('email/request')
  @HttpCode(204)
  @UseGuards(SameOriginGuard, SessionGuard)
  @ApiCookieAuth('session')
  @ApiNoContentResponse()
  @ApiServiceUnavailableResponse()
  requestEmailVerification(@Req() request: AuthRequest) {
    return this.lifecycle.requestVerification(
      request.account.id,
      request.socket.remoteAddress ?? 'unknown',
    );
  }

  @Post('email/verify')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  @ApiServiceUnavailableResponse()
  verifyEmail(@Body() body: AccountCodeDto, @Req() request: AuthRequest) {
    return this.lifecycle.complete(
      { kind: 'VERIFY_EMAIL', code: body.code },
      request.socket.remoteAddress ?? 'unknown',
    );
  }

  @Post('password/request')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  @ApiServiceUnavailableResponse()
  requestPasswordReset(@Body() body: EmailDto, @Req() request: AuthRequest) {
    return this.lifecycle.requestReset(
      body.email,
      request.socket.remoteAddress ?? 'unknown',
    );
  }

  @Post('password/reset')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @ApiNoContentResponse()
  @ApiServiceUnavailableResponse()
  resetPassword(@Body() body: ResetPasswordDto, @Req() request: AuthRequest) {
    return this.lifecycle.complete(
      { kind: 'RESET_PASSWORD', code: body.code, password: body.password },
      request.socket.remoteAddress ?? 'unknown',
    );
  }

  @Patch('accounts/:id/status')
  @HttpCode(204)
  @UseGuards(SameOriginGuard, SessionGuard, AdminGuard)
  @ApiCookieAuth('session')
  @ApiNoContentResponse()
  setAccountStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AccountStatusDto,
    @Req() request: AuthRequest,
  ) {
    return this.lifecycle.setSuspended(id, body.suspended, request.account.id);
  }

  @Put('me/avatar')
  @HttpCode(204)
  @UseGuards(SameOriginGuard, SessionGuard)
  @ApiCookieAuth('session')
  @ApiNoContentResponse()
  saveAvatar(@Body() body: AvatarDto, @Req() request: AuthRequest) {
    return this.avatars.save(request.account.id, body.image);
  }

  @Get('me/avatar')
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiCookieAuth('session')
  @ApiProduces('image/png')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async getAvatar(@Req() request: AuthRequest) {
    return new StreamableFile(await this.avatars.read(request.account.id), {
      type: 'image/png',
    });
  }

  @Delete('me/avatar')
  @HttpCode(204)
  @UseGuards(SameOriginGuard, SessionGuard)
  @ApiCookieAuth('session')
  @ApiNoContentResponse()
  deleteAvatar(@Req() request: AuthRequest) {
    return this.avatars.remove(request.account.id);
  }
}
