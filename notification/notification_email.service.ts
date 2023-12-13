import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException } from '@nestjs/common';
import ClientEntity from 'libs/database/entities/client.entity';
import InvoiceEntity from 'libs/database/entities/invoice.entity';
import UserEntity from 'libs/database/entities/user.entity';
import { FileStorageService } from 'libs/file-storage';
import { EmailService } from './email.service';

@Injectable()
export class NotificationEmailService {
	constructor(
		@InjectRepository(InvoiceEntity)
		private readonly invoiceRepository: EntityRepository<InvoiceEntity>,
		@InjectRepository(UserEntity)
		private readonly userRepository: EntityRepository<UserEntity>,
		@InjectRepository(ClientEntity)
		private readonly clientRepository: EntityRepository<ClientEntity>,
		private readonly fileStorageService: FileStorageService,
		private readonly emailService: EmailService
	) {}

	async createNewInvoice(invoiceId: string) {
		const invoice = await this.invoiceRepository.findOne(invoiceId);

		if (invoice == null) {
			throw new NotFoundException('Invoice not found');
		}

		const client = await this.clientRepository.findOne(invoice.client);

		if (client == null) {
			throw new NotFoundException('Client not found');
		}

		await this.emailService.send(client.email, 'Test Invoice', 'newInvoice', {}, [
			{
				filename: invoiceId + '.pdf',
				content: await this.fileStorageService.getInvoiceStream(invoiceId),
			},
		]);
	}

	async confirmEmail(token: string, email: string, frontendUrl: string) {
		await this.emailService.send(email, 'Test Invoice', 'confirmEmail', {
			confirmPage: `${frontendUrl}/email/verify/${token}`,
		});
	}

	async invoicePaid(userId: string, email: string) {
		const user = await this.userRepository.findOne(email);

		if (user == null) {
			console.log('User not found in notification invoice_paid');
			return;
		}

		if (user.emailNotifications.invoicePaid) {
			await this.emailService.send(email, 'Invoice Paid', 'invoicePaid');
		}
	}
}
