import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ServicesModule } from './services/services.module';
import { OrdersModule } from './orders/orders.module';
import { QuestionsModule } from './questions/questions.module';
import { AuthModule } from './auth/auth.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MailCronModule } from './mail-cron/mail-cron.module';
import { FaqModule } from './faq/faq.module';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ReviewsModule } from './reviews/reviews.module';
import { ZonesModule } from './zones/zones.module';
import * as fs from 'fs';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRootAsync({
      useFactory: () => {
        const root = process.cwd();
        // Intentar encontrar la carpeta uploads en el directorio actual o en ./backend/uploads
        // Esto cubre ejecución local desde el root y ejecución en Docker/backend root
        const paths = [
          join(root, 'uploads'),
          join(root, 'backend', 'uploads'),
        ];
        const uploadsPath = paths.find(p => fs.existsSync(p)) || paths[0];
        
        return [{
          rootPath: uploadsPath,
          serveRoot: '/uploads',
        }];
      },
    }),
    PrismaModule,
    UsersModule,
    ServicesModule,
    OrdersModule,
    QuestionsModule,
    AuthModule,
    PortfolioModule,
    NotificationsModule,
    MailCronModule,
    FaqModule,
    ReviewsModule,
    ZonesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
