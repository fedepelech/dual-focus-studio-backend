import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BARRIOS_INICIALES, PRECIO_BARRIO_POR_DEFECTO } from './constants/barrios.constants';

@Injectable()
export class BarriosService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Al iniciar el módulo, nos aseguramos de que todos los barrios predeterminados
   * (48 barrios de CABA + San Isidro) estén registrados en la base de datos.
   */
  async onModuleInit() {
    await this.asegurarBarriosIniciales();
  }

  /**
   * Obtiene todos los barrios registrados, ordenados alfabéticamente.
   * Permite filtrar únicamente los habilitados para el formulario de pedidos.
   */
  async findAll(onlyEnabled = false) {
    return this.prisma.barrioConfig.findMany({
      where: onlyEnabled ? { isEnabled: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Registra un nuevo barrio con su precio individual.
   */
  async create(name: string, price?: number) {
    return this.prisma.barrioConfig.create({
      data: {
        name: name.trim(),
        isEnabled: true,
        price: price ?? PRECIO_BARRIO_POR_DEFECTO,
      },
    });
  }

  /**
   * Actualiza el estado (habilitado/deshabilitado) o el precio individual de un barrio.
   */
  async update(id: string, data: { isEnabled?: boolean; price?: number }) {
    return this.prisma.barrioConfig.update({
      where: { id },
      data,
    });
  }

  /**
   * Elimina un barrio del sistema.
   */
  async delete(id: string) {
    return this.prisma.barrioConfig.delete({
      where: { id },
    });
  }

  /**
   * Verifica la existencia de los 48 barrios de CABA y San Isidro.
   * Si no existen, los crea con precio inicial por defecto.
   */
  async asegurarBarriosIniciales() {
    for (const nombreBarrio of BARRIOS_INICIALES) {
      await this.prisma.barrioConfig.upsert({
        where: { name: nombreBarrio },
        update: {},
        create: {
          name: nombreBarrio,
          isEnabled: true,
          price: PRECIO_BARRIO_POR_DEFECTO,
        },
      });
    }
  }
}
