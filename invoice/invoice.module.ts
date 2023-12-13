import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import InvoiceEntity from 'libs/database/entities/invoice.entity';
import ServiceEntity from 'libs/database/entities/service.entity';
import TagEntity from 'libs/database/entities/tag.entity';
import UserEntity from 'libs/database/entities/user.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { FileStorageModule } from 'libs/file-storage';
import puppeteer from 'puppeteer';
import { readFile } from 'fs/promises';
import ejs from 'ejs';
import { ChartController } from './chart.controller';
import ClientEntity from 'libs/database/entities/client.entity';

@Module({
	imports: [
		MikroOrmModule.forFeature([InvoiceEntity, ServiceEntity, TagEntity, UserEntity, ClientEntity]),
		NotificationModule,
		FileStorageModule,
	],
	providers: [
		InvoiceService,
		{
			provide: 'PUPPETEER_INSTANCE',
			useFactory: async () => await puppeteer.launch({ args: ['--no-sandbox', '--disable-gpu'] }),
		},
		{
			provide: 'EJS_TEMPLATE_INSTANCE',
			useFactory: async function () {
				const html = await readFile('./dist/invoice/templates/invoice.html', 'utf-8');
				return ejs.compile(html);
			},
		},
	],
	controllers: [InvoiceController, ChartController],
})
export class InvoiceModule {}
