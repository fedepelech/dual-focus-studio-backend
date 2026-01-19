import { PrismaClient, Role, ServiceCategory, QuestionInputType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data
  await prisma.orderResponse.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.questionOption.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.user.deleteMany({});

  // Create Admin User
  const hashedPassword = await bcrypt.hash('admin123secure', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@arqservicios.com',
      password: hashedPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  // Create Services
  const photography = await prisma.service.create({
    data: {
      name: 'Fotografía Inmobiliaria',
      description: 'Sesión de fotos profesional con post-producción.',
      category: ServiceCategory.FOTOGRAFIA,
      basePrice: 15000,
    },
  });

  const digitalPlan = await prisma.service.create({
    data: {
      name: 'Planos Digitales (Digitalización)',
      description: 'Relevamiento y digitalización en Archicad/Autocad.',
      category: ServiceCategory.PLANOS,
      basePrice: 25000,
    },
  });

  const videoPlan = await prisma.service.create({
    data: {
      name: 'Video Inmobiliario',
      description: 'Video inmobiliario profesional con post-producción.',
      category: ServiceCategory.VIDEO,
      basePrice: 20000,
    },
  });

  // --- PREGUNTAS DINÁMICAS ---

  // Planos Digitales
  await prisma.question.create({
    data: {
      text: '¿ServArq debe ir al inmueble para medir?',
      inputType: QuestionInputType.RADIO,
      serviceId: digitalPlan.id,
      displayOrder: 1,
      options: {
        create: [
          { label: 'Si, necesito que midan', description: 'No se tiene ni medidas ni plano físico', priceModifier: 5000 },
          { label: 'No es necesario (ya se tiene el plano)', description: 'El plano existente deberá ser validado por nuestro equipo', priceModifier: 0 },
        ],
      },
    },
  });

  await prisma.question.create({
    data: {
      text: 'Tipo de plano',
      inputType: QuestionInputType.RADIO,
      serviceId: digitalPlan.id,
      displayOrder: 2,
      options: {
        create: [
          { label: 'Plano básico', description: 'Incluye muros, puertas, ventanas y mobiliario de baño y cocina.', priceModifier: 0 },
          { label: 'Plano completo', description: 'Incluye lo anterior + muebles y electrodomésticos para visualizar escala y tamaño.', priceModifier: 3000 },
        ],
      },
    },
  });

  // Fotografía
  await prisma.question.create({
    data: {
      text: '¿Qué cantidad de ambientes hay que fotografiar?',
      inputType: QuestionInputType.NUMBER,
      serviceId: photography.id,
      displayOrder: 1,
    },
  });

  // Video
  await prisma.question.create({
    data: {
      text: 'Formato del video',
      inputType: QuestionInputType.RADIO,
      serviceId: videoPlan.id,
      displayOrder: 1,
      options: {
        create: [
          { label: 'Horizontal', description: 'Video en formato horizontal (tradicional)', priceModifier: 0 },
          { label: 'Vertical', description: 'Video en formato vertical (Instagram, TikTok)', priceModifier: 0 },
        ],
      },
    },
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
