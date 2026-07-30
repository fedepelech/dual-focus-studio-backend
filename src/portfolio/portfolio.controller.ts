import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { PortfolioService } from './portfolio.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceCategory } from '@prisma/client';

// Constantes de validación de archivos
const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const ALLOWED_IMAGE_MIME_TYPES = /\/(jpg|jpeg|png|gif|webp)$/;
const ALLOWED_VIDEO_MIME_TYPES = /^video\/(mp4|quicktime|webm|x-msvideo|mpeg|m4v|ogg)$/;

@Controller('portfolio')
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly storageService: StorageService,
  ) {}

  // --- PROYECTOS ---

  @Post('projects')
  @UseGuards(JwtAuthGuard)
  async createProject(
    @Body('title') title: string,
    @Body('description') description?: string,
    @Body('category') category?: ServiceCategory,
  ) {
    if (!title) {
      throw new BadRequestException('El título es requerido');
    }
    return this.portfolioService.createProject({ title, description, category });
  }

  @Get()
  async findAllProjects() {
    return this.portfolioService.findAllProjects();
  }

  @Get('projects/:id')
  async findOneProject(@Param('id') id: string) {
    return this.portfolioService.findOneProject(id);
  }

  @Patch('projects/:id')
  @UseGuards(JwtAuthGuard)
  async updateProject(@Param('id') id: string, @Body() data: any) {
    return this.portfolioService.updateProject(id, data);
  }

  @Delete('projects/:id')
  @UseGuards(JwtAuthGuard)
  async removeProject(@Param('id') id: string) {
    return this.portfolioService.removeProject(id);
  }

  // --- IMÁGENES (CLOUDFLARE R2) ---

  @Post('projects/:projectId/images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(ALLOWED_IMAGE_MIME_TYPES)) {
          return cb(new BadRequestException('Solo se permiten archivos de imagen'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: MAX_IMAGE_FILE_SIZE,
      },
    }),
  )
  async uploadImage(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
    @Body('displayOrder') displayOrder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se subió ningún archivo');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}${extname(file.originalname)}`;

    const url = await this.storageService.uploadFile(file.buffer, filename, file.mimetype);

    return this.portfolioService.addImageToProject(projectId, {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
      caption,
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0,
    });
  }

  @Patch('images/:id')
  @UseGuards(JwtAuthGuard)
  async updateImage(
    @Param('id') id: string,
    @Body() data: { caption?: string; displayOrder?: number },
  ) {
    return this.portfolioService.updateImage(id, data);
  }

  @Delete('images/:id')
  @UseGuards(JwtAuthGuard)
  async removeImage(@Param('id') id: string) {
    return this.portfolioService.removeImage(id);
  }

  // --- VIDEOS (CLOUDFLARE R2) ---

  /**
   * Sube un video a Cloudflare R2 Object Storage.
   */
  @Post('projects/:projectId/videos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(ALLOWED_VIDEO_MIME_TYPES)) {
          return cb(
            new BadRequestException('Solo se permiten archivos de video (MP4, MOV, WebM, AVI, MPEG)'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: MAX_VIDEO_FILE_SIZE,
      },
    }),
  )
  async uploadVideo(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
    @Body('displayOrder') displayOrder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se subió ningún archivo de video');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}${extname(file.originalname)}`;

    // Subir video a Cloudflare R2
    const url = await this.storageService.uploadFile(file.buffer, filename, file.mimetype);

    // Guardar el registro en la base de datos
    return this.portfolioService.addVideoToProject(projectId, {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
      title: title || file.originalname,
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0,
    });
  }

  @Patch('videos/:id')
  @UseGuards(JwtAuthGuard)
  async updateVideo(
    @Param('id') id: string,
    @Body() data: { title?: string; displayOrder?: number },
  ) {
    return this.portfolioService.updateVideo(id, data);
  }

  @Delete('videos/:id')
  @UseGuards(JwtAuthGuard)
  async removeVideo(@Param('id') id: string) {
    return this.portfolioService.removeVideo(id);
  }
}
