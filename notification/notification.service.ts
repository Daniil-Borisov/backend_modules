import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { QueryFlag } from '@mikro-orm/core';
import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationEntity } from 'libs/database/entities/notification.entity';
import { NotificationEmailService } from './notification_email.service';
import { NotificationEventRequest } from './types/notification_event_request.type';
import NotificationEvent from 'libs/database/enums/notification_event.enum';
import { FirebaseService } from './firebase.service';
import { ConfigService } from '@nestjs/config';
import { ListItemsDto } from 'src/common/dto/list_items.dto';
import { NotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
	readonly #numberItemsPerPage = 10;
	readonly #frontendUrl;

	constructor(
		@InjectRepository(NotificationEntity)
		private readonly notificationRepository: EntityRepository<NotificationEntity>,
		private readonly notificationEmailService: NotificationEmailService,
		private readonly firebaseService: FirebaseService,
		configService: ConfigService
	) {
		this.#frontendUrl = configService.get('FRONTEND_URL') ?? '';
	}

	async notifyInvoiceSent(userId: string, invoiceId: string) {
		const key = NotificationEvent.InvoiceSent;

		await this.notificationHandler({
			key,
			value: {
				key,
				invoiceId,
				userId,
			},
		});
	}

	async notifyInvoiceChangeStatus(userId: string, invoiceId: string) {
		const key = NotificationEvent.InvoiceChangeStatus;

		await this.notificationHandler({
			key,
			value: {
				key,
				invoiceId,
				userId,
			},
		});
	}

	async notifyInvoicePaid(userId: string, invoiceId: string, email: string) {
		const key = NotificationEvent.InvoicePaid;

		await this.notificationHandler({
			key,
			value: {
				key,
				invoiceId,
				userId,
				email,
			},
		});
	}

	async notifyEmailVerification(userId: string, token: string, email: string, frontendUrl?: string) {
		const key = NotificationEvent.EmailVerification;

		await this.notificationHandler({
			key,
			value: {
				key,
				token,
				email,
				userId,
				frontendUrl: frontendUrl ?? this.#frontendUrl,
			},
		});
	}

	public async listNotifications(
		userId: string,
		fromId = '',
		page = 1,
		status?: 'read' | 'unread'
	): Promise<ListItemsDto<NotificationDto>> {
		let where: any = { user: userId };

		if (fromId != '') {
			const notification = await this.notificationRepository.findOne(fromId);

			if (notification == null) {
				throw new BadRequestException('fromId not correct');
			}

			where = { user: userId, createdAt: { $gte: notification.createdAt }, id: { $ne: fromId } };
		}

		if (status != undefined) {
			where.status = status;
		}

		const [notifications, count] = await this.notificationRepository.findAndCount(where, {
			offset: (page - 1) * this.#numberItemsPerPage,
			limit: this.#numberItemsPerPage,
			flags: [QueryFlag.PAGINATE],
			orderBy: { createdAt: 'DESC' },
		});

		const response = ListItemsDto.init<NotificationDto>(notifications, page, count, this.#numberItemsPerPage);

		return response;
	}

	public async markRead(userId: string, id: string): Promise<void> {
		await this.notificationRepository.qb().update({ status: 'read' }).where({ id, user: userId }).execute();
	}

	public async markReadList(userId: string, ids: string[]): Promise<void> {
		if (ids.length == 0) {
			return;
		}

		await this.notificationRepository
			.qb()
			.update({ status: 'read' })
			.where({ id: { $in: ids }, user: userId })
			.execute();
	}

	public async markReadAll(userId: string): Promise<void> {
		await this.notificationRepository.qb().update({ status: 'read' }).where({ user: userId }).execute();
	}

	private async notificationHandler<Key extends NotificationEvent>(notification: NotificationEventRequest<Key>) {
		switch (notification.value.key) {
			case NotificationEvent.InvoiceSent:
				await this.notificationEmailService.createNewInvoice(notification.value.invoiceId);
				break;
			case NotificationEvent.InvoiceChangeStatus:
				await this.saveNotification(notification, 'Invoice change status');
				break;
			case NotificationEvent.EmailVerification:
				await this.notificationEmailService.confirmEmail(
					notification.value.token,
					notification.value.email,
					notification.value.frontendUrl
				);
				break;
			case NotificationEvent.InvoicePaid:
				await this.saveNotification(notification, 'Invoice paid');
				await this.notificationEmailService.invoicePaid(notification.value.userId, notification.value.email);
				break;
		}
	}

	private async saveNotification<Key extends NotificationEvent>(notification: NotificationEventRequest<Key>, message: string) {
		const newNotification = this.notificationRepository.create({
			user: notification.value.userId,
			key: notification.key,
			message,
		});

		await this.notificationRepository.persistAndFlush(newNotification);
		await this.firebaseService.sendNotification(newNotification);
	}
}
