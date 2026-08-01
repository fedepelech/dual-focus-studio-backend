import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as net from 'net';

@Injectable()
export class MailCronService implements OnModuleInit {
  private readonly logger = new Logger(MailCronService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private config: ConfigService,
  ) {}

  /**
   * Al iniciar el módulo, loguea la configuración SMTP y prueba la conectividad TCP
   * para facilitar el diagnóstico de problemas en producción.
   */
  async onModuleInit() {
    const host = this.config.get<string>('MAIL_HOST') || '(no definido)';
    const port = this.config.get<string>('MAIL_PORT') || '(no definido)';
    const user = this.config.get<string>('MAIL_USER') || '(no definido)';
    const pass = this.config.get<string>('MAIL_PASSWORD') || '';
    // Mostrar solo los primeros 3 caracteres de la contraseña por seguridad
    const maskedPass = pass.length > 3 ? `${pass.substring(0, 3)}***` : '(vacío)';

    this.logger.log(`=== Configuración SMTP ===`);
    this.logger.log(`  Host: ${host}`);
    this.logger.log(`  Port: ${port}`);
    this.logger.log(`  User: ${user}`);
    this.logger.log(`  Pass: ${maskedPass}`);
    this.logger.log(`=========================`);

    // Test de conectividad TCP al servidor SMTP
    const TIMEOUT_MS = 10000;
    const numericPort = parseInt(port, 10);
    if (!isNaN(numericPort)) {
      try {
        await this.testTcpConnection(host, numericPort, TIMEOUT_MS);
        this.logger.log(`✅ Conexión TCP a ${host}:${port} exitosa`);
      } catch (err: any) {
        this.logger.error(`❌ No se puede conectar a ${host}:${port} - ${err.message}`);
      }
    }
  }

  /**
   * Prueba la conexión TCP pura al host y puerto indicados.
   */
  private testTcpConnection(host: string, port: number, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Timeout después de ${timeoutMs}ms`));
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });

      socket.connect(port, host);
    });
  }

  // Se ejecuta cada 2 minutos
  @Cron('0 */2 * * * *')
  async handlePendingEmailNotifications() {
    this.logger.debug('Buscando notificaciones de mail pendientes...');

    // Buscamos notificaciones de tipo NEW_ORDER que no hayan sido enviadas por mail
    const pendingNotifications = await this.prisma.notification.findMany({
      where: {
        type: 'NEW_ORDER',
        emailSent: false,
      },
      include: {
        order: {
          include: {
            customer: true,
            services: {
              include: {
                service: true
              }
            },
          },
        },
      },
    });

    if (pendingNotifications.length === 0) {
      return;
    }

    this.logger.log(`Procesando ${pendingNotifications.length} notificaciones pendientes de envío.`);

    for (const notification of pendingNotifications) {
      if (!notification.order) {
        this.logger.warn(`La notificación ${notification.id} no tiene un pedido asociado.`);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { emailSent: true },
        });
        continue;
      }

      try {
        await this.mailService.sendNewOrderNotification(notification.order);
        
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { emailSent: true },
        });
        
        this.logger.log(`Email enviado con éxito para el pedido ${notification.order.id}`);
      } catch (error: any) {
        this.logger.error(`Error al procesar envío de mail para notificación ${notification.id}: ${error?.message || error}`);
      }
    }
  }
}
