import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ServiceCategory } from '@prisma/client';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  // --- PROYECTOS ---

  async createProject(data: {
    title: string;
    description?: string;
    category?: ServiceCategory;
  }) {
    return this.prisma.portfolioProject.create({
      data,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        videos: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }

  async findAllProjects() {
    return this.prisma.portfolioProject.findMany({
      where: { isActive: true },
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
        videos: {
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
        videos: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    return project;
  }

  async updateProject(id: string, data: any) {
    await this.findOneProject(id);
    const { images, videos, createdAt, updatedAt, ...sanitizedData } = data;
    return this.prisma.portfolioProject.update({
      where: { id },
      data: sanitizedData,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        videos: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }

  async removeProject(id: string) {
    await this.findOneProject(id);
    // Soft delete del proyecto
    return this.prisma.portfolioProject.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // --- IMÁGENES (CLOUDFLARE R2) ---

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

  // --- VIDEOS (CLOUDFLARE R2) ---

  async addVideoToProject(
    projectId: string,
    data: {
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      url: string;
      title?: string;
      displayOrder?: number;
    },
  ) {
    await this.findOneProject(projectId);

    return this.prisma.portfolioVideo.create({
      data: {
        ...data,
        projectId,
      },
    });
  }

  async updateVideo(id: string, data: { title?: string; displayOrder?: number }) {
    return this.prisma.portfolioVideo.update({
      where: { id },
      data,
    });
  }

  async removeVideo(id: string) {
    const video = await this.prisma.portfolioVideo.findUnique({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException('Video no encontrado');
    }

    // Eliminar archivo de Cloudflare R2
    await this.storageService.deleteFile(video.filename);

    // Eliminar registro de la base de datos
    return this.prisma.portfolioVideo.delete({
      where: { id },
    });
  }
}
