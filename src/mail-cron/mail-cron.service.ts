import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class MailCronService {
  private readonly logger = new Logger(MailCronService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

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
