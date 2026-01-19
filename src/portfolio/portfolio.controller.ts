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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceCategory } from '@prisma/client';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

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

  // --- IMÁGENES ---

  @Post('projects/:projectId/images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Solo se permiten archivos de imagen'), false);
        }
        cb(null, true);
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

    return this.portfolioService.addImageToProject(projectId, {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
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
}
