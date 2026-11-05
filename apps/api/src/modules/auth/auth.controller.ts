import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthResponse } from '@vampiro/shared';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '../../common/auth/public.decorator.js';
import { AppConfig } from '../../config/app-config.service.js';
import { AuthService, type SessionResult } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

export const REFRESH_COOKIE = 'vampiro_rt';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.withCookie(res, await this.auth.register(dto));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.withCookie(res, await this.auth.login(dto));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.withCookie(res, await this.auth.refresh(readCookie(req)));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readCookie(req));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  private withCookie(res: Response, session: SessionResult): AuthResponse {
    res.cookie(REFRESH_COOKIE, session.refresh.token, {
      ...this.cookieOptions(),
      expires: session.refresh.expiresAt,
    });
    return session.body;
  }

  /** httpOnly (no la lee JS), SameSite=Strict (no viaja desde otros sitios) y solo para /auth. */
  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.config.isProduction,
      path: '/api/v1/auth',
    };
  }
}

function readCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
