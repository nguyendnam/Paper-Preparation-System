import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import {
  AuthedRequest,
  AuthUser,
  CurrentUser,
  Public,
} from './auth.decorators';

class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu cần tối thiểu 8 ký tự.' })
  @MaxLength(128)
  password!: string;

  /** Optional: create a research group and become its Main Author. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  groupName?: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

class ChangePasswordDto {
  @IsString()
  current!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới cần tối thiểu 8 ký tự.' })
  @MaxLength(128)
  next!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.auth.register(dto);
    this.setCookie(res, token);
    return this.auth.me(user.id);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.auth.login(dto.email, dto.password);
    this.setCookie(res, token);
    return this.auth.me(user.id);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    await this.auth.logout(cookies?.[this.auth.cookieName]);
    res.clearCookie(this.auth.cookieName, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Post('password')
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.auth.changePassword(user.id, dto.current, dto.next);
    return { ok: true };
  }

  private setCookie(res: Response, token: string) {
    res.cookie(this.auth.cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV') === 'production',
      maxAge: this.auth.ttlMs,
      path: '/',
    });
  }
}
