import Joi from 'joi';
import NotificationEvent from 'libs/database/enums/notification_event.enum';
import { JoiSchema } from 'nestjs-joi';

export class NotificationDto {
	@JoiSchema(Joi.string().uuid().required())
	id!: string;

	@JoiSchema(Joi.string().required())
	message!: string;

	@JoiSchema(Joi.string().valid('unread', 'read').optional())
	status!: 'unread' | 'read';

	@JoiSchema(
		Joi.string()
			.valid(...Object.values(NotificationEvent))
			.required()
	)
	key!: NotificationEvent;

	@JoiSchema(Joi.date().required())
	createdAt!: Date;
}
