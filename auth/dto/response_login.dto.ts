import Joi from 'joi';
import { JoiSchema } from 'nestjs-joi';
import { ResponseJwtDto } from './response_jwt.dto';

export class ResponseLoginDto extends ResponseJwtDto {
	@JoiSchema(Joi.string().required())
	userId!: string;
}
