import Joi from 'joi';
import { JoiSchema } from 'nestjs-joi';

export class NotificationsListDto {
	@JoiSchema(Joi.array().items(Joi.string().uuid()).unique().required())
	notifications!: string[];
}
