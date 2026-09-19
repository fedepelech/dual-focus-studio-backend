import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BarriosService } from './barrios.service';

@Controller('barrios')
export class BarriosController {
  constructor(private readonly barriosService: BarriosService) {}

  @Get()
  findAll(@Query('onlyEnabled') onlyEnabled?: string) {
    const filtrarSoloHabilitados = onlyEnabled === 'true';
    return this.barriosService.findAll(filtrarSoloHabilitados);
  }

  @Post()
  create(
    @Body('name') name: string,
    @Body('price') price?: number,
  ) {
    return this.barriosService.create(name, price);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body('isEnabled') isEnabled?: boolean,
    @Body('price') price?: number,
  ) {
    return this.barriosService.update(id, { isEnabled, price });
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.barriosService.delete(id);
  }
}
