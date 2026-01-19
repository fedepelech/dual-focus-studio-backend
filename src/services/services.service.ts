import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.service.findMany();
  }

  async findOne(id: string) {
    return this.prisma.service.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    return this.prisma.service.update({
      where: { id },
      data,
    });
  }
}
