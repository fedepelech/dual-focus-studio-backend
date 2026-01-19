import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(data: any) {
    const { responses, customerId, serviceId, ...orderData } = data;
    
    const order = await this.prisma.order.create({
      data: {
        ...orderData,
        customer: { connect: { id: customerId } },
        service: { connect: { id: serviceId } },
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
        service: true,
      }
    });

    // Create notification for admin
    try {
      await this.notificationsService.create(
        'NEW_ORDER',
        `Nuevo pedido de ${order.customer.name} para ${order.service.name}`,
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
        service: true,
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
        service: true,
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
      include: { service: true },
    });
  }
}
