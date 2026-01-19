import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findOrCreate(data: Prisma.UserCreateInput): Promise<User> {
    // Primero buscar si existe
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existing) return existing;

    // Si no existe, crearlo
    return this.prisma.user.create({ data });
  }
}
