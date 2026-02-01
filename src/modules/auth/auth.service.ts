import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { logMeta } from '../../common/utils/logger.utils';
import { isUniqueViolationOnField } from '../../common/utils/prisma-errors.util';

import { AuthResponse, AuthUser } from './auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          region: dto.region,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          region: true,
          isActive: true,
          createdAt: true,
        },
      });

      this.logger.log('User registered', logMeta({ userId: user.id }));

      const accessToken = await this.jwt.signAsync({
        sub: user.id,
        email: user.email,
        region: user.region,
      });

      const authUser: AuthUser = {
        ...user,
      };

      return { user: authUser, accessToken };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002' &&
        isUniqueViolationOnField(e, 'email')
      ) {
        this.logger.warn(
          'Registration failed (email already in use)',
          logMeta({ email: dto.email }),
        );
        throw new ConflictException('Email already in use');
      }

      this.logger.error(
        'Registration failed (unexpected error)',
        logMeta({
          email: dto.email,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
      throw e;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
        region: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      // Avoid user enumeration: same message for all credential failures
      this.logger.warn(
        'Login failed',
        logMeta({
          email: dto.email,
          reason: 'invalid_credentials_or_inactive',
        }),
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      this.logger.warn(
        'Login failed',
        logMeta({
          email: dto.email,
          userId: user.id,
          reason: 'invalid_credentials',
        }),
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log('User logged in', logMeta({ userId: user.id }));

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      region: user.region,
    });

    const { passwordHash: _passwordHash, ...safeUser } = user;

    const authUser: AuthUser = {
      id: safeUser.id,
      email: safeUser.email,
      region: safeUser.region,
      isActive: safeUser.isActive,
      createdAt: safeUser.createdAt,
    };

    return { user: authUser, accessToken };
  }
}
