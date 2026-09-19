import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { ReviewsService } from '../reviews/reviews.service';
import { OrderStatus, ServiceCategory } from '@prisma/client';

// Constantes fijas para los nombres de las preguntas con precios escalonados
const DEFAULT_PRICE = 0;
const PREGUNTA_CANTIDAD_AMBIENTES = 'Cantidad de ambientes';
const PREGUNTA_METROS_CUADRADOS = 'Metros cuadrados a medir';

// Ventana de tiempo (en milisegundos) para detectar pedidos duplicados por doble clic o peticiones concurrentes
const VENTANA_DUPLICADOS_MS = 10000;

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
   * Suma: precios base de servicios + modificadores de opciones + pricing escalonado condicionado por categoría.
  */
  async calculateTotalPrice(
    serviceIds: string[],
    responses: { questionId: string; optionId?: string; textValue?: string }[],
    barrio?: string,
  ): Promise<number> {
    let total = DEFAULT_PRICE;

    let hasPlanos = false;
    let hasFotoOrVideo = false;

    // 1. Sumar precios base de los servicios seleccionados y detectar categorías de servicios fijos
    if (serviceIds.length > 0) {
      const services = await this.prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, category: true, basePrice: true },
      });
      total += services.reduce((sum, s) => sum + (s.basePrice || 0), 0);

      hasPlanos = services.some(s => s.category === ServiceCategory.PLANOS);
      hasFotoOrVideo = services.some(
        s => s.category === ServiceCategory.FOTOGRAFIA || s.category === ServiceCategory.VIDEO
      );
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
          text: true,
          pricingBaseUnits: true,
          pricingStepSize: true,
          pricingStepPrice: true,
        },
      });

      // Calcular precio adicional por cada pregunta con pricing escalonado condicionado al servicio
      for (const question of questionsWithPricing) {
        // Si es cobro por ambientes, solo aplica si se seleccionó servicio de Planos
        if (question.text === PREGUNTA_CANTIDAD_AMBIENTES && !hasPlanos) continue;

        // Si es cobro por metros cuadrados, solo aplica si se seleccionó servicio de Fotografía o Video
        if (question.text === PREGUNTA_METROS_CUADRADOS && !hasFotoOrVideo) continue;

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

    // 3. Precio individual asignado al barrio / ubicación
    if (barrio) {
      const barrioConfig = await this.prisma.barrioConfig.findUnique({
        where: { name: barrio },
        select: { price: true, isEnabled: true },
      });
      if (barrioConfig?.isEnabled && barrioConfig.price) {
        total += barrioConfig.price;
      }
    }

    return total;
  }

  async create(data: any) {
    const { responses, customerId, serviceIds, totalPrice, ...orderData } = data;

    // Prevenir pedidos duplicados si llega una petición idéntica del mismo cliente en los últimos segundos
    if (customerId && orderData.address) {
      const fechaLimite = new Date(Date.now() - VENTANA_DUPLICADOS_MS);
      const pedidoExistente = await this.prisma.order.findFirst({
        where: {
          customerId,
          address: orderData.address,
          createdAt: { gte: fechaLimite },
        },
        include: {
          responses: true,
          customer: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      });

      if (pedidoExistente) {
        return pedidoExistente;
      }
    }
    
    // Calcular precio total en el backend (no confiar solo en el frontend)
    const calculatedPrice = await this.calculateTotalPrice(
      serviceIds || [],
      responses || [],
      data.barrio,
    );

    const order = await this.prisma.order.create({
      data: {
        ...orderData,
        totalPrice: calculatedPrice,
        barrio: data.barrio || null,
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
   * Si pasa a COMPLETED, genera token de valoración y envía email en segundo plano.
   */
  async updateStatus(id: string, status: OrderStatus) {
    // Validar que el estado enviado pertenezca al enum OrderStatus
    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException(`Estado '${status}' no es válido`);
    }

    // 1. Actualizar el estado en la base de datos
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

    // 2. Si se marcó como completado, intentar generar review y enviar mail de valoración
    if (status === OrderStatus.COMPLETED) {
      // Ejecutar en try/catch independiente para que nunca falle la respuesta HTTP 200
      this.processCompletedOrderReview(order).catch(err => {
        console.error('Error procesando review tras completar pedido:', err);
      });
    }

    return order;
  }

  private async processCompletedOrderReview(order: any) {
    try {
      const review = await this.reviewsService.createToken(order.id, order.customer?.name || 'Cliente');
      if (review && review.token) {
        await this.mailService.sendReviewRequest(order, review.token);
        console.log(`Email de valoración enviado correctamente para el pedido ${order.id}`);
      }
    } catch (error) {
      console.error('Error al procesar el email de valoración:', error);
    }
  }
}
