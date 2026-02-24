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
  createSubzone(@Body('name') name: string) {
    return this.zonesService.createSubzone(name);
  }

  @Patch('gba-subzones/:id')
  updateSubzone(
    @Param('id') id: string,
    @Body('isEnabled') isEnabled: boolean
  ) {
    return this.zonesService.updateSubzone(id, isEnabled);
  }

  @Delete('gba-subzones/:id')
  deleteSubzone(@Param('id') id: string) {
    return this.zonesService.deleteSubzone(id);
  }
}
