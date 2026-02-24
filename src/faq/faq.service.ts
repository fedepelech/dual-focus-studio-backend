import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FaqService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener solo las FAQs activas, ordenadas por displayOrder.
   * Usado para la sección pública del sitio.
   */
  async findActive() {
    return this.prisma.faq.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Obtener todas las FAQs (activas e inactivas).
   * Usado por el panel de administración.
   */
  async findAll() {
    return this.prisma.faq.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  }

  async create(data: { question: string; answer: string; displayOrder?: number }) {
    return this.prisma.faq.create({ data });
  }

  async update(id: string, data: { question?: string; answer?: string; displayOrder?: number; isActive?: boolean }) {
    return this.prisma.faq.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.faq.delete({
      where: { id },
    });
  }
}
