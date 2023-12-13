import * as crypto from 'crypto';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { JwtService } from '@nestjs/jwt';
import { PayloadType } from './types/payload.type';
import { ResponseLoginDto } from './dto/response_login.dto';
import UserEntity from 'libs/database/entities/user.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';
import WalletEntity from 'libs/database/entities/wallet.entity';
import RefreshTokenEntity from 'libs/database/entities/refresh_token.entity';
import { ResponseNonceDto } from './dto/response_nonce.dto';
import { ResponseJwtDto } from './dto/response_jwt.dto';
import Blockchain from '../../libs/database/src/enums/blockchain.enum';
import { BlockchainHandler } from './blockchain_handlers/blockchain_handler.interface';
import { EthereumHandler } from './blockchain_handlers/ethereum.handler';
import { ResponseCreateEntityDto } from 'src/common/dto/response_create_entity.dto';

@Injectable()
export class AuthService {
	readonly #accessTokenExpire = '30m';
	readonly #refreshTokenExpire = '3d';

	readonly #nonceMessage: string;
	readonly #cryptocurrencyAuthHandlers: Map<Blockchain, BlockchainHandler>;

	constructor(
		@InjectRedis() private readonly redis: Redis,
		private readonly jwtService: JwtService,
		@InjectRepository(WalletEntity) private readonly walletRepository: EntityRepository<WalletEntity>,
		@InjectRepository(UserEntity) private readonly userRepository: EntityRepository<UserEntity>,
		@InjectRepository(RefreshTokenEntity) private readonly refreshTokenRepository: EntityRepository<RefreshTokenEntity>
	) {
		this.#cryptocurrencyAuthHandlers = new Map();

		this.#cryptocurrencyAuthHandlers.set(Blockchain.Ethereum, new EthereumHandler());

		this.#nonceMessage = `Hi there from Magic Invoices! Sign this message to prove you have access to this wallet and we'll log you in. This won't cost you any Ether.
        To stop hackers using your wallet, here's a unique message ID they can't guess: `;
	}

	public async generateNonce(publicAddress: string): Promise<ResponseNonceDto> {
		const cryptocurrencyHandler = this.#cryptocurrencyAuthHandlers.get(Blockchain.Ethereum);

		if (cryptocurrencyHandler == undefined || cryptocurrencyHandler.isValidPublicAddress(publicAddress) == false) {
			throw new BadRequestException('Not valid public address');
		}

		const nonce = crypto.randomBytes(16).toString('hex');
		const expire = 1800; // 10 minute in seconds
		const message = this.#nonceMessage + nonce;

		await this.redis.set(publicAddress, nonce, 'EX', expire);

		return { message };
	}

	public async login(publicAddress: string, signature: string, blockchain: Blockchain, signup = true): Promise<ResponseLoginDto> {
		const cryptocurrencyHandler = this.#cryptocurrencyAuthHandlers.get(blockchain);

		if (cryptocurrencyHandler == undefined || cryptocurrencyHandler.isValidPublicAddress(publicAddress) == false) {
			throw new BadRequestException('Not valid public address');
		}

		const nonce = await this.redis.getdel(publicAddress);

		if (nonce == null) {
			throw new BadRequestException('Not Found Nonce');
		}

		const message = this.#nonceMessage + nonce;
		const address = cryptocurrencyHandler.getPublicAddressBySignature(signature, message);

		if (address != publicAddress.toLowerCase()) {
			throw new BadRequestException('Signature Not Valid');
		}

		const wallet = await this.walletRepository.findOne({ publicAddress }, { populate: ['user'] });
		let user: UserEntity | null = null;

		if (wallet == null && signup) {
			user = new UserEntity();
			const newWallet = this.walletRepository.create({ publicAddress, user, blockchain });

			await this.walletRepository.persistAndFlush(newWallet);
		} else if (wallet == null) {
			throw new NotFoundException('User Not Found');
		} else {
			user = wallet.user.getEntity();
		}

		const expires = new Date();
		expires.setDate(expires.getDate() + 3);

		const refreshTokenEntity = this.refreshTokenRepository.create({ user, expires });

		await this.refreshTokenRepository.persistAndFlush(refreshTokenEntity);

		const payloadAccessToken = Object.assign({}, new PayloadType(user.id));
		const payloadRefreshToken = Object.assign({}, new PayloadType(user.id, refreshTokenEntity.id));

		const accessToken = this.jwtService.sign(payloadAccessToken, { expiresIn: this.#accessTokenExpire });
		const refreshToken = this.jwtService.sign(payloadRefreshToken, { expiresIn: this.#refreshTokenExpire });

		return {
			userId: user.id,
			accessToken,
			refreshToken,
		};
	}

	public async logout(refreshToken: string): Promise<void> {
		let payload: PayloadType;

		try {
			payload = await this.jwtService.verifyAsync<PayloadType>(refreshToken);
		} catch (error) {
			throw new UnauthorizedException('JWT expired');
		}

		if (payload.s == undefined) {
			throw new BadRequestException('Need refresh token');
		}

		const token = await this.refreshTokenRepository.findOne(payload.s);

		if (token == null) {
			throw new BadRequestException('Not Found Token');
		}

		token.isRevoked = true;

		await this.refreshTokenRepository.persistAndFlush(token);
	}

	public async addWallet(
		publicAddress: string,
		signature: string,
		blockchain: Blockchain,
		userId: string
	): Promise<ResponseCreateEntityDto> {
		const cryptocurrencyHandler = this.#cryptocurrencyAuthHandlers.get(blockchain);

		if (cryptocurrencyHandler == undefined || cryptocurrencyHandler.isValidPublicAddress(publicAddress) == false) {
			throw new BadRequestException('Not valid public address');
		}

		const user = await this.userRepository.findOne(userId);

		if (user == null) {
			throw new BadRequestException('Not Found User');
		}

		const nonce = await this.redis.getdel(publicAddress);

		if (nonce == null) {
			throw new BadRequestException('Not Found Nonce');
		}

		const message = this.#nonceMessage + nonce;
		const address = cryptocurrencyHandler.getPublicAddressBySignature(signature, message);

		if (address != publicAddress.toLowerCase()) {
			throw new BadRequestException('Signature Not Valid');
		}

		let wallet = await this.walletRepository.findOne({ publicAddress });

		if (wallet == null) {
			wallet = this.walletRepository.create({ publicAddress, user, blockchain });

			await this.walletRepository.persistAndFlush(wallet);
		} else {
			throw new BadRequestException('Wallet Exists');
		}

		return {
			id: wallet.id,
		};
	}

	public async refresh(oldRefreshToken: string): Promise<ResponseJwtDto> {
		let payload: PayloadType;

		try {
			payload = await this.jwtService.verifyAsync<PayloadType>(oldRefreshToken);
		} catch (error) {
			throw new UnauthorizedException('JWT expired');
		}

		if (payload.s == undefined) {
			throw new BadRequestException('Need refresh token');
		}

		const refreshTokenEntity = await this.refreshTokenRepository.findOne(payload.s);

		if (refreshTokenEntity == null || refreshTokenEntity.isRevoked) {
			throw new BadRequestException('Not Found Token');
		}

		const expires = new Date();
		expires.setDate(expires.getDate() + 3);

		refreshTokenEntity.expires = expires;

		await this.refreshTokenRepository.persistAndFlush(refreshTokenEntity);

		const payloadAccessToken = Object.assign({}, new PayloadType(refreshTokenEntity.user.id));
		const payloadRefreshToken = Object.assign({}, new PayloadType(refreshTokenEntity.user.id, refreshTokenEntity.id));

		const accessToken = this.jwtService.sign(payloadAccessToken, { expiresIn: this.#accessTokenExpire });
		const refreshToken = this.jwtService.sign(payloadRefreshToken, { expiresIn: this.#refreshTokenExpire });

		return {
			accessToken,
			refreshToken,
		};
	}
}
