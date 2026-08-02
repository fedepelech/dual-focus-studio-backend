import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;
  private from: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY no está configurada. Los emails no se enviarán.');
    }
    this.resend = new Resend(apiKey || '');
    this.from = this.config.get<string>('MAIL_FROM') || 'Dual Focus Studio <no-reply@dualfocus.com.ar>';
  }

  async sendNewOrderNotification(order: any) {
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:5173';
    const recipient = this.config.get<string>('MAIL_NOTIFICATION_RECIPIENT');

    if (!recipient) {
      this.logger.warn('MAIL_NOTIFICATION_RECIPIENT no está configurado. No se enviará el mail.');
      return;
    }

    try {
      const serviceNames = order.services.map((s: any) => s.service.name).join(', ');
      const date = new Date(order.createdAt).toLocaleString('es-AR');
      const orderUrl = `${frontendUrl}/admin/orders/${order.id}`;

      const { error } = await this.resend.emails.send({
        from: this.from,
        to: recipient,
        subject: `Nuevo Pedido Generado - ${order.customer.name}`,
        html: this.buildNewOrderHtml({
          customerName: order.customer.name,
          customerEmail: order.customer.email,
          serviceName: serviceNames,
          address: order.address,
          date,
          orderUrl,
        }),
      });

      if (error) {
        throw new Error(error.message);
      }

      this.logger.log(`Email de notificación enviado para el pedido ${order.id}`);
    } catch (error) {
      this.logger.error('Error al enviar el email de notificación:', error);
      throw error;
    }
  }

  async sendReviewRequest(order: any, token: string) {
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:5173';
    const reviewUrl = `${frontendUrl}/valorar/${token}`;

    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: order.customer.email,
        subject: '¿Cómo fue tu experiencia con Dual Focus Studio?',
        html: this.buildReviewRequestHtml({
          customerName: order.customer.name,
          reviewUrl,
        }),
      });

      if (error) {
        throw new Error(error.message);
      }

      this.logger.log(`Email de solicitud de valoración enviado a ${order.customer.email}`);
    } catch (error) {
      this.logger.error('Error al enviar el email de solicitud de valoración:', error);
    }
  }

  /**
   * Genera el HTML del email de notificación de nuevo pedido.
   */
  private buildNewOrderHtml(ctx: {
    customerName: string;
    customerEmail: string;
    serviceName: string;
    address: string;
    date: string;
    orderUrl: string;
  }): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Nuevo Pedido Recibido</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #1e3a5f;
            color: #e4d0bb;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 8px 8px;
        }
        .info-group {
            margin-bottom: 20px;
        }
        .label {
            font-weight: bold;
            color: #1e3a5f;
            display: block;
        }
        .value {
            font-size: 1.1em;
        }
        .button {
            display: inline-block;
            background-color: #e4d0bb;
            color: #1e3a5f !important;
            padding: 12px 25px;
            text-decoration: none;
            font-weight: bold;
            border-radius: 5px;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 0.8em;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Nuevo Pedido Registrado</h1>
    </div>
    <div class="content">
        <p>Se ha generado un nuevo pedido en el sistema:</p>
        
        <div class="info-group">
            <span class="label">Cliente:</span>
            <span class="value">${ctx.customerName} (${ctx.customerEmail})</span>
        </div>
        
        <div class="info-group">
            <span class="label">Servicio:</span>
            <span class="value">${ctx.serviceName}</span>
        </div>
        
        <div class="info-group">
            <span class="label">Dirección:</span>
            <span class="value">${ctx.address}</span>
        </div>
        
        <div class="info-group">
            <span class="label">Fecha:</span>
            <span class="value">${ctx.date}</span>
        </div>

        <p>Podés ver los detalles completos del pedido y gestionarlo desde el panel de administración:</p>
        
        <a href="${ctx.orderUrl}" class="button">Ver Detalles del Pedido</a>
    </div>
    <div class="footer">
        <p>Este es un mensaje automático generado por el sistema de Dual Focus Studio.</p>
    </div>
</body>
</html>`;
  }

  /**
   * Genera el HTML del email de solicitud de valoración.
   */
  private buildReviewRequestHtml(ctx: {
    customerName: string;
    reviewUrl: string;
  }): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Valorá nuestro trabajo</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #1c304a;
      color: #e4d0bb;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #fcfaf7;
      padding: 30px;
      border: 1px solid #e4d0bb;
      border-top: none;
      border-radius: 0 0 8px 8px;
      text-align: center;
    }
    .button {
      display: inline-block;
      background-color: #e4d0bb;
      color: #1c304a !important;
      padding: 15px 30px;
      text-decoration: none;
      font-weight: bold;
      border-radius: 5px;
      margin-top: 25px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .footer {
      text-align: center;
      margin-top: 25px;
      font-size: 0.85em;
      color: #777;
    }
    .stars {
      color: #f1c40f;
      font-size: 24px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>¡Gracias por confiar en nosotros!</h1>
  </div>
  <div class="content">
    <p>Hola <strong>${ctx.customerName}</strong>,</p>
    <p>Tu pedido ha sido finalizado con éxito. Para nosotros es muy importante conocer tu opinión y seguir mejorando día a día.</p>

    <div class="stars">★★★★★</div>

    <p>¿Podrías dedicarnos un minuto para valorar el trabajo realizado?</p>

    <a href="${ctx.reviewUrl}" class="button">Dejar mi valoración</a>

    <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
      Tu comentario ayudará a otros profesionales a conocernos.
    </p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} Dual Focus Studio - Servicios de Arquitectura</p>
    <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
  </div>
</body>
</html>`;
  }
}
