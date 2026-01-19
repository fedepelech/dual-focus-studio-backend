import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  findAll(@Query('serviceIds') serviceIds?: string) {
    if (serviceIds) {
      const ids = serviceIds.split(',');
      return this.questionsService.findByServices(ids);
    }
    return this.questionsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() data: any) {
    return this.questionsService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.questionsService.update(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/options')
  createOption(@Param('id') id: string, @Body() data: any) {
    return this.questionsService.createOption(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('options/:id')
  updateOption(@Param('id') id: string, @Body() data: any) {
    return this.questionsService.updateOption(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('options/:id')
  removeOption(@Param('id') id: string) {
    return this.questionsService.removeOption(id);
  }
}
