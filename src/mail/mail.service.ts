import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    private config: ConfigService,
  ) {}

  async sendNewOrderNotification(order: any) {
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:5173';
    const recipient = this.config.get('MAIL_NOTIFICATION_RECIPIENT');

    if (!recipient) {
      console.warn('MAIL_NOTIFICATION_RECIPIENT no está configurado. No se enviará el mail.');
      return;
    }

    try {
      const serviceNames = order.services.map((s: any) => s.service.name).join(', ');
      
      await this.mailerService.sendMail({
        to: recipient,
        subject: `Nuevo Pedido Generado - ${order.customer.name}`,
        template: './new-order', // nombre del archivo del template sin .hbs
        context: {
          customerName: order.customer.name,
          customerEmail: order.customer.email,
          serviceName: serviceNames,
          address: order.address,
          orderId: order.id,
          date: new Date(order.createdAt).toLocaleString('es-AR'),
          orderUrl: `${frontendUrl}/admin/orders/${order.id}`,
        },
      });
      console.log(`Email de notificación enviado para el pedido ${order.id}`);
    } catch (error) {
      console.error('Error al enviar el email de notificación:', error);
      throw error;
    }
  }

  async sendReviewRequest(order: any, token: string) {
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:5173';
    
    try {
      await this.mailerService.sendMail({
        to: order.customer.email,
        subject: `¿Cómo fue tu experiencia con Dual Focus Studio?`,
        template: './review-request',
        context: {
          customerName: order.customer.name,
          reviewUrl: `${frontendUrl}/valorar/${token}`,
        },
      });
      console.log(`Email de solicitud de valoración enviado a ${order.customer.email}`);
    } catch (error) {
      console.error('Error al enviar el email de solicitud de valoración:', error);
    }
  }
}
