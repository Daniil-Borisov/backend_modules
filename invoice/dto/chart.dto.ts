import Joi from 'joi';
import { JoiSchema } from 'nestjs-joi';

export class ChartDto {
	@JoiSchema(Joi.string().required())
	key!: string;

	@JoiSchema(Joi.string().required())
	value!: string;
}
