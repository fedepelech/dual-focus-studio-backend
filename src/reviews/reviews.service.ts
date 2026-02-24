import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un token de valoración para un pedido.
   * Se llama cuando el pedido pasa a COMPLETED.
   */
  async createToken(orderId: string, authorName: string) {
    const token = uuidv4();
    
    // Verificamos si ya existe una review para esta orden
    const existing = await this.prisma.review.findUnique({
      where: { orderId }
    });

    if (existing) return existing;

    return this.prisma.review.create({
      data: {
        orderId,
        token,
        authorName,
        rating: 0, // Inicialmente 0 hasta que el cliente la complete
        isApproved: true,
      }
    });
  }

  /**
   * Valida un token y devuelve la información básica.
   */
  async checkToken(token: string) {
    const review = await this.prisma.review.findUnique({
      where: { token },
      include: {
        order: {
          include: {
            services: {
              include: {
                service: true
              }
            }
          }
        }
      }
    });

    if (!review) {
      throw new NotFoundException('Token de valoración no válido');
    }

    if (review.rating > 0) {
      throw new BadRequestException('Esta valoración ya ha sido completada');
    }

    return review;
  }

  /**
   * Envía la valoración del cliente.
   */
  async submitReview(token: string, data: { rating: number; comment?: string }) {
    const review = await this.prisma.review.findUnique({
      where: { token }
    });

    if (!review) {
      throw new NotFoundException('Token no válido');
    }

    if (review.rating > 0) {
      throw new BadRequestException('Ya enviaste tu valoración para este pedido');
    }

    return this.prisma.review.update({
      where: { token },
      data: {
        rating: data.rating,
        comment: data.comment,
        createdAt: new Date(),
      }
    });
  }

  /**
   * Obtiene todas las valoraciones aprobadas (para el frontend público).
   */
  async findAllApproved() {
    return this.prisma.review.findMany({
      where: { 
        isApproved: true,
        rating: { gt: 0 } // Solo las que ya fueron completadas
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }

  /**
   * Obtiene todas las valoraciones (para admin).
   */
  async findAllAdmin() {
    return this.prisma.review.findMany({
      include: {
        order: {
          include: {
            customer: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Aprueba o rechaza una valoración.
   */
  async toggleApproval(id: string, isApproved: boolean) {
    return this.prisma.review.update({
      where: { id },
      data: { isApproved }
    });
  }
}
