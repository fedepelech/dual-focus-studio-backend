import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => {
        const cleanEnv = (key: string) => {
          const val = config.get<string>(key);
          return val ? val.replace(/^["']|["']$/g, '').trim() : '';
        };

        const rawPort = cleanEnv('MAIL_PORT');
        const port = parseInt(rawPort, 10) || 465;
        const host = cleanEnv('MAIL_HOST') || 'smtp.zoho.com';
        const user = cleanEnv('MAIL_USER');
        const pass = cleanEnv('MAIL_PASSWORD');
        const from = cleanEnv('MAIL_FROM');

        return {
          transport: {
            host,
            port,
            secure: port === 465,
            requireTLS: port === 587,
            auth: { user, pass },
            tls: {
              rejectUnauthorized: false,
            },
            connectionTimeout: 10000, // 10s
            greetingTimeout: 10000,   // 10s
            socketTimeout: 15000,     // 15s
          },
          defaults: {
            from,
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
