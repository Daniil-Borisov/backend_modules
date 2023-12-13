import Joi from 'joi';
import { JoiSchema } from 'nestjs-joi';

export class RefreshTokenDto {
	@JoiSchema(Joi.string().required())
	refreshToken!: string;
}
