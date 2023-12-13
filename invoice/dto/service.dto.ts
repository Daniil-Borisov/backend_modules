import Joi from 'joi';
import { CREATE, getTypeSchema, JoiSchema, UPDATE } from 'nestjs-joi';
import { TagDto } from 'src/tag/dto/tag.dto';

const checkProperty = Joi.string().min(1).max(255);
const checkNumber = Joi.number().min(0).integer();

export class ServiceDto {
	@JoiSchema(Joi.string().uuid().required())
	@JoiSchema([CREATE], Joi.string().uuid().forbidden())
	id!: string;

	@JoiSchema(checkProperty.required())
	@JoiSchema([UPDATE], checkProperty.optional())
	description!: string;

	@JoiSchema(getTypeSchema(TagDto, { group: 'RESPONSE' }))
	@JoiSchema([CREATE, 'RESPONSE'], Joi.string().uuid().required())
	@JoiSchema([UPDATE], Joi.string().uuid().optional())
	tag!: string | TagDto;

	@JoiSchema(checkNumber.required())
	@JoiSchema([UPDATE], checkNumber.optional())
	rate!: number;

	@JoiSchema(checkNumber.required())
	@JoiSchema([UPDATE], checkNumber.optional())
	qty!: number;

	@JoiSchema(checkNumber.forbidden())
	@JoiSchema(['RESPONSE'], checkNumber.required())
	amount!: number;
}
