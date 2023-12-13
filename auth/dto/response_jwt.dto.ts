import Joi from 'joi';
import { JoiSchema } from 'nestjs-joi';

export class ResponseJwtDto {
	@JoiSchema(Joi.string().required())
	accessToken!: string;

	@JoiSchema(Joi.string().required())
	refreshToken!: string;
}
