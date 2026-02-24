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
  
  // Preguntas Globales - SECCIÓN INMUEBLE (Sección 1)
  await prisma.question.create({
    data: {
      text: 'Cantidad de ambientes',
      inputType: QuestionInputType.NUMBER,
      displayOrder: 1,
      displaySection: 1, // Se muestra en el paso de Inmueble
    },
  });

  await prisma.question.create({
    data: {
      text: '¿Hay que relevar amenities?',
      inputType: QuestionInputType.SELECT,
      displayOrder: 2,
      displaySection: 1, // Se muestra en el paso de Inmueble
      options: {
        create: [
          { label: 'No', priceModifier: 0 },
          { label: 'Hasta 2', priceModifier: 5000 },
          { label: 'Más de 3', priceModifier: 8000 },
        ],
      },
    },
  });

  // Planos Digitales
  const qMedir = await prisma.question.create({
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
    include: { options: true }
  });

  const optionNoNecesario = qMedir.options.find(o => o.label.includes('No es necesario'));

  // Pregunta global de metros cuadrados (aplica a todos los servicios)
  await prisma.question.create({
    data: {
      text: 'Metros cuadrados a medir',
      inputType: QuestionInputType.NUMBER,
      displayOrder: 3,
      displaySection: 1, // Se muestra en el paso de Inmueble
      pricingBaseUnits: 100,   // Hasta 100m² incluido
      pricingStepSize: 1,      // Por cada m² extra
      pricingStepPrice: 230,   // $230 por m² adicional
    },
  });

  await prisma.question.create({
    data: {
      text: 'Tipo de plano',
      inputType: QuestionInputType.RADIO,
      serviceId: digitalPlan.id,
      displayOrder: 3,
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
      text: 'Formato de las fotos',
      inputType: QuestionInputType.RADIO,
      serviceId: photography.id,
      displayOrder: 1,
      options: {
        create: [
          { label: 'Vertical', priceModifier: 0 },
          { label: 'Horizontal', priceModifier: 0 },
          { label: 'Ambas', priceModifier: 0 },
        ],
      },
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

  // --- FAQs INICIALES ---
  await prisma.faq.deleteMany({});

  const faqData = [
    {
      question: '¿Cuánto demora la entrega del material?',
      answer: 'Las fotografías se entregan en un plazo de 24 a 48 horas hábiles. Los planos digitales pueden demorar entre 3 y 5 días hábiles dependiendo de la complejidad del relevamiento.',
      displayOrder: 0,
    },
    {
      question: '¿Qué incluye el precio base del servicio?',
      answer: 'El precio base incluye la visita al inmueble, la sesión de fotos o relevamiento, y la post-producción o digitalización. Costos adicionales aplican para amenities, metros cuadrados extra, o formatos especiales.',
      displayOrder: 1,
    },
    {
      question: '¿Cuáles son las formas de pago?',
      answer: 'Aceptamos transferencia bancaria, MercadoPago y efectivo. El pago se realiza 50% al confirmar el pedido y 50% al recibir el material final.',
      displayOrder: 2,
    },
    {
      question: '¿En qué formato se entregan los archivos?',
      answer: 'Las fotografías se entregan en formato JPG de alta resolución. Los planos digitales se entregan en formato DWG (AutoCAD) y PDF. Los videos se entregan en formato MP4 en la resolución acordada.',
      displayOrder: 3,
    },
    {
      question: '¿Puedo cancelar o reprogramar mi pedido?',
      answer: 'Sí, podés cancelar o reprogramar tu pedido con al menos 24 horas de anticipación sin costo adicional. Cancelaciones con menos de 24 horas pueden tener un cargo del 20% del valor del servicio.',
      displayOrder: 4,
    },
  ];

  for (const faq of faqData) {
    await prisma.faq.create({ data: faq });
  }

  // --- ZONAS AMBA/GBA ---
  const gbaPartidos = [
    // GBA Norte
    'Tigre', 'San Fernando', 'San Isidro', 'Vicente López', 'San Martín', 
    'Tres de Febrero', 'Hurlingham', 'Ituzaingó', 'Morón', 'Malvinas Argentinas', 
    'José C. Paz', 'San Miguel',
    // GBA Sur
    'Avellaneda', 'Lanús', 'Lomas de Zamora', 'Almirante Brown', 'Quilmes', 
    'Berazategui', 'Florencio Varela', 'Esteban Echeverría', 'Ezeiza',
    // GBA Oeste
    'La Matanza', 'Merlo', 'Moreno', 'Marcos Paz', 'General Rodríguez'
  ];

  console.log('Seed: Creando subzonas GBA...');
  for (const name of gbaPartidos) {
    await prisma.gbaSubzoneConfig.upsert({
      where: { name },
      update: {},
      create: { name, isEnabled: true },
    });
  }

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
