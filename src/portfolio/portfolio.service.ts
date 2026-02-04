import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ServiceCategory } from '@prisma/client';

@Injectable()
export class PortfolioService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  // --- PROYECTOS ---

  async createProject(data: {
    title: string;
    description?: string;
    category?: ServiceCategory;
  }) {
    return this.prisma.portfolioProject.create({
      data,
      include: { images: true },
    });
  }

  async findAllProjects() {
    return this.prisma.portfolioProject.findMany({
      where: { isActive: true },
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneProject(id: string) {
    const project = await this.prisma.portfolioProject.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    return project;
  }

  async updateProject(id: string, data: any) {
    await this.findOneProject(id);
    const { images, createdAt, updatedAt, ...sanitizedData } = data;
    return this.prisma.portfolioProject.update({
      where: { id },
      data: sanitizedData,
      include: { images: true },
    });
  }

  async removeProject(id: string) {
    await this.findOneProject(id);
    // Soft delete
    return this.prisma.portfolioProject.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // --- IMÁGENES ---

  async addImageToProject(
    projectId: string,
    data: {
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      url: string;
      caption?: string;
      displayOrder?: number;
    },
  ) {
    // Verificar que el proyecto existe
    await this.findOneProject(projectId);
    return this.prisma.portfolioImage.create({
      data: {
        ...data,
        projectId,
      },
    });
  }

  async updateImage(id: string, data: { caption?: string; displayOrder?: number }) {
    return this.prisma.portfolioImage.update({
      where: { id },
      data,
    });
  }

  async removeImage(id: string) {
    // Obtener la imagen para tener el filename
    const image = await this.prisma.portfolioImage.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException('Imagen no encontrada');
    }

    // Eliminar de R2
    await this.storageService.deleteFile(image.filename);

    // Eliminar de la base de datos
    return this.prisma.portfolioImage.delete({
      where: { id },
    });
  }
}
