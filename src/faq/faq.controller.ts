import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { FaqService } from './faq.service';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  /** Endpoint público: devuelve solo las FAQs activas */
  @Get()
  findActive() {
    return this.faqService.findActive();
  }

  /** Endpoint admin: devuelve todas las FAQs */
  @Get('all')
  findAll() {
    return this.faqService.findAll();
  }

  @Post()
  create(@Body() body: { question: string; answer: string; displayOrder?: number }) {
    return this.faqService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { question?: string; answer?: string; displayOrder?: number; isActive?: boolean },
  ) {
    return this.faqService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.faqService.remove(id);
  }
}
