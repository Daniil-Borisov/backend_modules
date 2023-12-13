import Joi from 'joi';
import { IdentifiedReference, Collection } from '@mikro-orm/core';
import { CREATE, getTypeSchema, JoiSchema, UPDATE } from 'nestjs-joi';
import InvoiceStatus from 'libs/database/enums/invoice_status.enum';
import { ServiceDto } from './service.dto';
import UserEntity from 'libs/database/entities/user.entity';
import ClientEntity from 'libs/database/entities/client.entity';
import ServiceEntity from 'libs/database/entities/service.entity';
import { ClientDto } from 'src/client/dto/client.dto';

const checkEmail = Joi.string().email().max(255);
const checkName = Joi.string().min(1).max(50);
const checkProperty = Joi.string().max(255);
const checkCountry = Joi.string().min(1).max(100);
const checkZip = Joi.string().allow('').max(18);
const checkDate = Joi.date();
const checkBool = Joi.bool();
const checkNumber = Joi.number().min(0).integer();

export class InvoiceDto {
	@JoiSchema(Joi.string().uuid().forbidden())
	@JoiSchema(['RESPONSE'], Joi.string().uuid().required())
	id?: string;

	@JoiSchema(checkProperty.forbidden())
	@JoiSchema(['RESPONSE'], checkProperty.required())
	number!: string;

	@JoiSchema(checkProperty.min(1).required())
	@JoiSchema([UPDATE], checkProperty.min(1).optional())
	projectName!: string;

	@JoiSchema(checkProperty.min(1).optional())
	logoUrl?: string;

	@JoiSchema(Joi.string().uuid().required())
	@JoiSchema([UPDATE, CREATE], Joi.string().uuid().forbidden())
	author!: string | IdentifiedReference<UserEntity>;

	@JoiSchema(checkEmail.required())
	@JoiSchema([UPDATE], checkEmail.optional())
	invoiceFromEmail!: string;

	@JoiSchema(checkName.required())
	@JoiSchema([UPDATE], checkName.optional())
	invoiceFromFirstName!: string;

	@JoiSchema(checkName.required())
	@JoiSchema([UPDATE], checkName.optional())
	invoiceFromLastName!: string;

	@JoiSchema(checkProperty.min(1).required())
	@JoiSchema([UPDATE], checkProperty.min(1).optional())
	invoiceFromCompanyName!: string;

	@JoiSchema(checkProperty.allow('').required())
	@JoiSchema([UPDATE], checkProperty.allow('').optional())
	invoiceFromTitle!: string;

	@JoiSchema(checkProperty.min(1).required())
	@JoiSchema([UPDATE], checkProperty.min(1).optional())
	invoiceFromAddressOne!: string;

	@JoiSchema(checkProperty.allow('').required())
	@JoiSchema([UPDATE], checkProperty.allow('').optional())
	invoiceFromAddressTwo!: string;

	@JoiSchema(checkProperty.min(1).required())
	@JoiSchema([UPDATE], checkProperty.min(1).optional())
	invoiceFromCity!: string;

	@JoiSchema(checkCountry.required())
	@JoiSchema([UPDATE], checkCountry.optional())
	invoiceFromCountry!: string;

	@JoiSchema(checkZip.required())
	@JoiSchema([UPDATE], checkZip.optional())
	invoiceFromZip!: string;

	@JoiSchema(Joi.string().uuid().required())
	@JoiSchema([UPDATE], Joi.string().uuid().optional())
	@JoiSchema(['GET_INVOICE'], getTypeSchema(ClientDto, { group: 'RESPONSE' }))
	client!: string | IdentifiedReference<ClientEntity>;

	@JoiSchema(checkDate.required())
	@JoiSchema([UPDATE], checkDate.optional())
	dueDate!: Date;

	@JoiSchema(checkBool.default(false).required())
	@JoiSchema([UPDATE], checkBool.default(false).optional())
	autoReminder!: boolean;

	@JoiSchema(checkProperty.required())
	@JoiSchema([UPDATE], checkProperty.optional())
	walletNumber!: string;

	@JoiSchema(Joi.array().items(getTypeSchema(ServiceDto)).min(1).required())
	@JoiSchema(
		['RESPONSE', 'GET_INVOICE'],
		Joi.array()
			.items(getTypeSchema(ServiceDto, { group: 'RESPONSE' }))
			.min(1)
			.required()
	)
	@JoiSchema(
		[CREATE],
		Joi.array()
			.items(getTypeSchema(ServiceDto, { group: CREATE }))
			.min(1)
			.required()
	)
	@JoiSchema(
		[UPDATE],
		Joi.array()
			.items(getTypeSchema(ServiceDto, { group: UPDATE }))
			.min(1)
			.optional()
	)
	services!: Collection<ServiceEntity> | ServiceEntity[];

	@JoiSchema(
		Joi.string()
			.valid(...Object.values(InvoiceStatus))
			.required()
	)
	@JoiSchema([UPDATE], Joi.string().valid(InvoiceStatus.New).optional())
	@JoiSchema([CREATE], Joi.string().forbidden())
	status!: InvoiceStatus;

	@JoiSchema(Joi.date().required())
	@JoiSchema([CREATE, UPDATE], Joi.date().forbidden())
	createDate!: Date;

	@JoiSchema(checkNumber.forbidden())
	@JoiSchema(['RESPONSE'], checkNumber.required())
	total!: number;
}
