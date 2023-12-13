import Joi from 'joi';
import { JoiSchema } from 'nestjs-joi';

export class ResponsePdfLinkDto {
	@JoiSchema(Joi.string().uri().required())
	url!: string;
}
