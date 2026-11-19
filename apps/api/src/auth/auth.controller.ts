import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import {
  AccountResponse,
  CredentialsDto,
  ProfileDto,
  RegisterDto,
} from './auth.dto.js';
import {
  AdminGuard,
  SameOriginGuard,
  SessionGuard,
  type AuthRequest,
} from './auth.guards.js';
import { AuthService } from './auth.service.js';
import { readSession, sessionCookie } from './session.js';

interface CookieResponse {
  setHeader(name: string, value: string): void;
}

@ApiTags('accounts')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @UseGuards(SameOriginGuard)
  @Header('Cache-Control', 'no-store')
  @ApiCreatedResponse({ type: AccountResponse })
  @ApiConflictResponse()
  @ApiForbiddenResponse()
  async register(
    @Body() input: RegisterDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const { account, token } = await this.auth.register(
      input,
      request.socket.remoteAddress ?? 'unknown',
      readSession(request.headers.cookie),
    );
    response.setHeader('Set-Cookie', sessionCookie(token));
    return account;
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(SameOriginGuard)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AccountResponse })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async login(
    @Body() input: CredentialsDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const { account, token } = await this.auth.login(
      input,
      request.socket.remoteAddress ?? 'unknown',
      readSession(request.headers.cookie),
    );
    response.setHeader('Set-Cookie', sessionCookie(token));
    return account;
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(SameOriginGuard)
  @Header('Cache-Control', 'no-store')
  @ApiNoContentResponse()
  @ApiForbiddenResponse()
  async logout(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    await this.auth.logout(readSession(request.headers.cookie));
    response.setHeader('Set-Cookie', sessionCookie());
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'no-store')
  @ApiCookieAuth('session')
  @ApiOkResponse({ type: AccountResponse })
  @ApiUnauthorizedResponse()
  getProfile(@Req() request: AuthRequest) {
    return request.account;
  }

  @Patch('me')
  @UseGuards(SameOriginGuard, SessionGuard)
  @Header('Cache-Control', 'no-store')
  @ApiCookieAuth('session')
  @ApiOkResponse({ type: AccountResponse })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  updateProfile(@Req() request: AuthRequest, @Body() input: ProfileDto) {
    return this.auth.updateProfile(request.account.id, input.name);
  }

  @Get('accounts')
  @UseGuards(SessionGuard, AdminGuard)
  @Header('Cache-Control', 'no-store')
  @ApiCookieAuth('session')
  @ApiOkResponse({ type: AccountResponse, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listAccounts() {
    return this.auth.listAccounts();
  }
}
