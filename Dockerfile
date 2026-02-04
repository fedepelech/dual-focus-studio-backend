FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# ARG para invalidar cache cuando sea necesario
ARG CACHEBUST=1

# Generar cliente Prisma y compilar NestJS
RUN npx prisma generate && npm run build

EXPOSE 3000

# Ejecutar migraciones y arrancar en producción
CMD ["npm", "run", "start:prod"]
