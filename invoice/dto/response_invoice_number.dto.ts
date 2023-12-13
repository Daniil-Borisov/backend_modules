import Joi from 'joi';
import { JoiSchema } from 'nestjs-joi';

export class ResponseInvoiceNumberDto {
	@JoiSchema(Joi.string().required())
	invoiceNumber!: string;
}
