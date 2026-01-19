import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private failedAttempts = 0;
  private readonly MAX_ATTEMPTS = 5;
  private isLocked = false;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async validateAdmin(email: string, pass: string): Promise<any> {
    if (this.isLocked) {
      this.logger.error(`BLOQUEO DE SEGURIDAD: Intento de acceso a cuenta administrativa bloqueada para el email: ${email}`);
      throw new UnauthorizedException('Cuenta bloqueada por múltiples intentos fallidos. Contacte al administrador del sistema.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== 'ADMIN') {
      this.registerFailedAttempt(email);
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.password);

    if (isMatch) {
      this.failedAttempts = 0; // Resetear intentos al tener éxito
      return { email: user.email, role: user.role, userId: user.id };
    }

    this.registerFailedAttempt(email);
    return null;
  }

  private registerFailedAttempt(email: string) {
    this.failedAttempts++;
    this.logger.warn(`Intento de login fallido (${this.failedAttempts}/${this.MAX_ATTEMPTS}) para email: ${email}`);

    if (this.failedAttempts >= this.MAX_ATTEMPTS) {
      this.isLocked = true;
      this.logger.error(`ALERTA DE SEGURIDAD: Cuenta administrativa BLOQUEADA tras ${this.MAX_ATTEMPTS} intentos fallidos.`);
    }
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.userId, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getAdminStatus() {
    return {
      isLocked: this.isLocked,
      failedAttempts: this.failedAttempts,
    };
  }
}
