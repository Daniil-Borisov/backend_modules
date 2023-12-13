import Joi from 'joi';
import { JoiSchema } from 'nestjs-joi';
import Blockchain from '../../../libs/database/src/enums/blockchain.enum';

export class AddWalletDto {
	@JoiSchema(Joi.string().required())
	publicAddress!: string;

	@JoiSchema(Joi.string().required())
	signature!: string;

	@JoiSchema(
		Joi.string()
			.valid(...Object.values(Blockchain))
			.required()
	)
	blockchain!: Blockchain;
}
