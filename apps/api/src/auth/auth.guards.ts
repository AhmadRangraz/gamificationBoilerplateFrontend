import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { AccountResponse } from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { readSession } from './session.js';

export interface AuthRequest {
  headers: { origin?: string; cookie?: string };
  socket: { remoteAddress?: string };
  account: AccountResponse;
}

export function parseWebOrigin(value: string) {
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.origin !== value ||
    (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
  ) {
    throw new Error(
      'WEB_ORIGIN must be a plain web origin, with HTTPS in production.',
    );
  }
  return url.origin;
}

@Injectable()
export class SameOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const { origin } = context.switchToHttp().getRequest<AuthRequest>().headers;
    const configured = process.env.WEB_ORIGIN;
    const trusted = configured
      ? [parseWebOrigin(configured)]
      : process.env.NODE_ENV === 'production'
        ? []
        : ['http://localhost:3000', 'http://127.0.0.1:3000'];

    if (!origin || !trusted.includes(origin)) {
      throw new ForbiddenException('مبدأ درخواست معتبر نیست.');
    }
    return true;
  }
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const account = await this.auth.resolve(
      readSession(request.headers.cookie),
    );
    if (!account) throw new UnauthorizedException('لطفاً وارد حساب خود شوید.');
    request.account = account;
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (request.account.role !== 'ADMIN') {
      throw new ForbiddenException('به این بخش دسترسی ندارید.');
    }
    return true;
  }
}
