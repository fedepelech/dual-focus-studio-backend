import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ZonesService } from './zones.service';

@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get('gba-subzones')
  findAllSubzones() {
    return this.zonesService.findAllSubzones();
  }

  @Post('gba-subzones')
  createSubzone(
    @Body('name') name: string,
    @Body('extraPrice') extraPrice?: number,
  ) {
    return this.zonesService.createSubzone(name, extraPrice);
  }

  @Patch('gba-subzones/:id')
  updateSubzone(
    @Param('id') id: string,
    @Body('isEnabled') isEnabled?: boolean,
    @Body('extraPrice') extraPrice?: number,
  ) {
    return this.zonesService.updateSubzone(id, { isEnabled, extraPrice });
  }

  @Delete('gba-subzones/:id')
  deleteSubzone(@Param('id') id: string) {
    return this.zonesService.deleteSubzone(id);
  }
}
