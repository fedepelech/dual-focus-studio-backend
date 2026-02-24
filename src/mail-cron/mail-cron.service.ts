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

  // Se ejecuta cada 30 segundos
  @Cron('*/30 * * * * *')
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
        // Marcamos como enviada para no procesarla de nuevo o podríamos borrarla
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { emailSent: true },
        });
        continue;
      }

      try {
        await this.mailService.sendNewOrderNotification(notification.order);
        
        // Marcamos la notificación como enviada por email
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { emailSent: true },
        });
        
        this.logger.log(`Email enviado con éxito para el pedido ${notification.order.id}`);
      } catch (error) {
        this.logger.error(`Error al procesar el envío de mail para la notificación ${notification.id}:`, error);
        // No marcamos como enviado para reintentar en el próximo ciclo
      }
    }
  }
}
