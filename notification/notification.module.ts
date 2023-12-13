import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MailerModule } from '@nestjs-modules/mailer';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import InvoiceEntity from 'libs/database/entities/invoice.entity';
import { NotificationEntity } from 'libs/database/entities/notification.entity';
import { FileStorageModule } from 'libs/file-storage';
import { join } from 'path';
import { NotificationEmailService } from './notification_email.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import UserEntity from 'libs/database/entities/user.entity';
import { FirebaseService } from './firebase.service';
import ClientEntity from 'libs/database/entities/client.entity';

@Module({
	imports: [
		ConfigModule,
		MailerModule.forRootAsync({
			useFactory: async (config: ConfigService) => ({
				transport: {
					host: config.get('MAIL_HOST'),
					port: config.get('MAIL_PORT'),
					secure: true,
					auth: {
						type: 'OAuth2',
						user: config.get('GMAIL_CLIENT_EMAIL'),
						serviceClient: config.get('GMAIL_CLIENT_ID'),
						privateKey: config.get('GMAIL_PRIVATE_KEY').replaceAll(`\\n`, '\n'),
					},
				},
				defaults: {
					from: `"No Reply" <${config.get('MAIL_FROM')}>`,
				},
				template: {
					dir: join(__dirname, '../../', '/notification/email_templates'),
					adapter: new EjsAdapter(),
					options: {},
				},
			}),
			inject: [ConfigService],
		}),
		MikroOrmModule.forFeature([InvoiceEntity, NotificationEntity, UserEntity, ClientEntity]),
		FileStorageModule,
		ConfigModule,
	],
	providers: [EmailService, NotificationEmailService, NotificationService, FirebaseService],
	controllers: [NotificationController],
	exports: [NotificationService],
})
export class NotificationModule {}
