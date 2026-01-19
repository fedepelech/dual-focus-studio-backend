import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.question.findMany({
      include: {
        options: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  async findByServices(serviceIds: string[]) {
    return this.prisma.question.findMany({
      where: {
        OR: [
          { serviceId: null }, // Preguntas comunes
          { serviceId: { in: serviceIds } }, // Preguntas específicas
        ],
        isActive: true,
      },
      include: {
        options: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  async create(data: any) {
    // Sanitizar entrada para evitar errores con relaciones o campos de sistema
    const { id, options, createdAt, updatedAt, ...sanitizedData } = data;
    return this.prisma.question.create({
      data: sanitizedData,
      include: { options: true },
    });
  }

  async update(id: string, data: any) {
    // Sanitizar entrada para evitar errores con relaciones o campos de sistema
    const { id: _, options, createdAt, updatedAt, ...sanitizedData } = data;
    return this.prisma.question.update({
      where: { id },
      data: sanitizedData,
      include: { options: true },
    });
  }

  async remove(id: string) {
    return this.prisma.question.delete({
      where: { id },
    });
  }

  async createOption(questionId: string, data: any) {
    return this.prisma.questionOption.create({
      data: {
        ...data,
        questionId,
      },
    });
  }

  async updateOption(id: string, data: any) {
    return this.prisma.questionOption.update({
      where: { id },
      data,
    });
  }

  async removeOption(id: string) {
    return this.prisma.questionOption.delete({
      where: { id },
    });
  }
}
