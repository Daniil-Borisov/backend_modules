import Joi from 'joi';
import { JoiSchema } from 'nestjs-joi';

export class ClientInvoicesStatisticsDto {
	@JoiSchema(Joi.number().integer().required())
	draftCount!: number;

	@JoiSchema(Joi.number().integer().required())
	newCount!: number;

	@JoiSchema(Joi.number().integer().required())
	pendingPaymentCount!: number;

	@JoiSchema(Joi.number().integer().required())
	paidCount!: number;

	@JoiSchema(Joi.number().integer().required())
	archiveCount!: number;

	@JoiSchema(Joi.number().integer().required())
	countInvoices!: number;

	@JoiSchema(Joi.number().integer().required())
	total!: number;

	@JoiSchema(Joi.number().integer().required())
	totalAmountEarned!: number;
}
