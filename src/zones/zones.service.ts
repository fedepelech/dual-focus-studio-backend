import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  async findAllSubzones() {
    return this.prisma.gbaSubzoneConfig.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async createSubzone(name: string, extraPrice?: number) {
    return this.prisma.gbaSubzoneConfig.create({
      data: { name, isEnabled: true, extraPrice: extraPrice ?? 0 }
    });
  }

  async updateSubzone(id: string, data: { isEnabled?: boolean; extraPrice?: number }) {
    return this.prisma.gbaSubzoneConfig.update({
      where: { id },
      data,
    });
  }

  async deleteSubzone(id: string) {
    return this.prisma.gbaSubzoneConfig.delete({
      where: { id }
    });
  }
}
