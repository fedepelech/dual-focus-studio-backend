import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MailCronService } from './mail-cron.service';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MailModule,
    PrismaModule,
  ],
  providers: [MailCronService],
})
export class MailCronModule {}
