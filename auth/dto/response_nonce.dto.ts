import Joi from 'joi';
import { JoiSchema } from 'nestjs-joi';

export class ResponseNonceDto {
	@JoiSchema(Joi.string().required())
	message!: string;
}
