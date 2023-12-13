import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { NotificationEntity } from 'libs/database/entities/notification.entity';

@Injectable()
export class FirebaseService {
	readonly #firebase;

	constructor(configService: ConfigService) {
		const projectId = configService.get('FIREBASE_PROJECT_ID') ?? '';
		const clientEmail = configService.get('FIREBASE_CLIENT_EMAIL') ?? '';
		const privateKey = (configService.get('FIREBASE_PRIVATE_KEY') ?? '').replaceAll(`\\n`, '\n');

		this.#firebase = admin.initializeApp({
			credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
		});
	}

	public async sendNotification(notification: NotificationEntity) {
		const message = {
			data: {
				id: notification.id,
				message: notification.message,
				status: notification.status,
				key: notification.key,
				createdAt: notification.createdAt.toString(),
			},
			topic: notification.user,
		};

		await getMessaging().send(message);
	}
}
