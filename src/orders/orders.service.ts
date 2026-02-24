import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { ReviewsService } from '../reviews/reviews.service';
import { OrderStatus } from '@prisma/client';

// Constantes para valores por defecto del cálculo de precio
const DEFAULT_PRICE = 0;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
    private reviewsService: ReviewsService,
  ) {}

  /**
   * Calcula el precio total estimado de un pedido.
   * Suma: precios base de servicios + modificadores de opciones + pricing escalonado.
  */
  async calculateTotalPrice(
    serviceIds: string[],
    responses: { questionId: string; optionId?: string; textValue?: string }[],
  ): Promise<number> {
    let total = DEFAULT_PRICE;

    // 1. Sumar precios base de los servicios seleccionados
    if (serviceIds.length > 0) {
      const services = await this.prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { basePrice: true },
      });
      total += services.reduce((sum, s) => sum + (s.basePrice || 0), 0);
    }

    // 2. Procesar respuestas: modificadores de opciones + pricing escalonado
    if (responses && responses.length > 0) {
      const optionIds = responses
        .filter(r => r.optionId)
        .map(r => r.optionId!);
      
      // Obtener modificadores de precio de las opciones seleccionadas
      if (optionIds.length > 0) {
        const options = await this.prisma.questionOption.findMany({
          where: { id: { in: optionIds } },
          select: { priceModifier: true },
        });
        total += options.reduce((sum, o) => sum + (o.priceModifier || 0), 0);
      }

      // Obtener preguntas con pricing escalonado para las respuestas numéricas
      const questionIds = responses.map(r => r.questionId);
      const questionsWithPricing = await this.prisma.question.findMany({
        where: {
          id: { in: questionIds },
          inputType: 'NUMBER',
          pricingBaseUnits: { not: null },
          pricingStepSize: { not: null },
          pricingStepPrice: { not: null },
        },
        select: {
          id: true,
          pricingBaseUnits: true,
          pricingStepSize: true,
          pricingStepPrice: true,
        },
      });

      // Calcular precio adicional por cada pregunta con pricing escalonado
      for (const question of questionsWithPricing) {
        const response = responses.find(r => r.questionId === question.id);
        if (response?.textValue) {
          const valor = parseFloat(response.textValue);
          if (!isNaN(valor) && question.pricingBaseUnits && question.pricingStepSize && question.pricingStepPrice) {
            const unidadesExtra = Math.max(0, valor - question.pricingBaseUnits);
            const pasos = Math.ceil(unidadesExtra / question.pricingStepSize);
            total += pasos * question.pricingStepPrice;
          }
        }
      }
    }

    return total;
  }

  async create(data: any) {
    const { responses, customerId, serviceIds, totalPrice, ...orderData } = data;
    
    // Calcular precio total en el backend (no confiar solo en el frontend)
    const calculatedPrice = await this.calculateTotalPrice(
      serviceIds || [],
      responses || [],
    );

    const order = await this.prisma.order.create({
      data: {
        ...orderData,
        totalPrice: calculatedPrice,
        customer: { connect: { id: customerId } },
        services: {
          create: serviceIds.map((serviceId: string) => ({
            service: { connect: { id: serviceId } }
          }))
        },
        responses: responses ? {
          create: responses.map((r: any) => ({
            questionId: r.questionId,
            optionId: r.optionId || null,
            textValue: r.textValue || null,
          })),
        } : undefined,
        gbaSubzone: data.gbaSubzone || null,
      },
      include: {
        responses: true,
        customer: true,
        services: {
          include: {
            service: true
          }
        },
      }
    });

    // Crear notificación para admin
    try {
      const serviceNames = order.services.map(s => s.service.name).join(', ');
      await this.notificationsService.create(
        'NEW_ORDER',
        `Nuevo pedido de ${order.customer.name} para: ${serviceNames}`,
        order.id
      );
    } catch (error) {
      console.error('Error creating notification:', error);
      // No lanzar el error para que el pedido se cree de todas formas
    }

    return order;
  }

  async findAll() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        services: {
          include: {
            service: true
          }
        },
        responses: {
          include: {
            option: true,
          }
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        services: {
          include: {
            service: true
          }
        },
        responses: {
          include: {
            question: true,
            option: true,
          }
        },
      },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: { 
        services: {
          include: {
            service: true
          }
        }
      },
    });
  }

  /**
   * Actualiza el estado de un pedido.
   * Si pasa a COMPLETED, genera token de valoración y envía email.
   */
  async updateStatus(id: string, status: OrderStatus) {
    // Solo permitir COMPLETED o CANCELLED según requerimiento del admin
    if (status !== OrderStatus.COMPLETED && status !== OrderStatus.CANCELLED) {
      throw new BadRequestException('Solo se puede cambiar el estado a FINALIZADO o CANCELADO');
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        services: {
          include: {
            service: true
          }
        }
      }
    });

    if (status === OrderStatus.COMPLETED) {
      try {
        // 1. Crear token de valoración
        const review = await this.reviewsService.createToken(order.id, order.customer.name || 'Cliente');
        
        // 2. Enviar email al cliente
        await this.mailService.sendReviewRequest(order, review.token);
        
        console.log(`Email de valoración enviado para el pedido ${order.id}`);
      } catch (error) {
        console.error('Error al procesar valoración tras completar pedido:', error);
      }
    }

    return order;
  }
}
