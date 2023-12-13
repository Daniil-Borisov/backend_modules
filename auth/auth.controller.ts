import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { RefreshTokenId } from 'src/common/decorators/refresh_token.decorator';
import { UserId } from 'src/common/decorators/user.decorator';
import { ResponseCreateEntityDto } from 'src/common/dto/response_create_entity.dto';
import joi2swagger from 'src/common/utils/joi2swagger';
import { AuthService } from './auth.service';
import { AddWalletDto } from './dto/add_wallet.dto';
import { RefreshTokenDto } from './dto/refresh_token.dto';
import { ResponseJwtDto } from './dto/response_jwt.dto';
import { ResponseLoginDto } from './dto/response_login.dto';
import { ResponseNonceDto } from './dto/response_nonce.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Get('nonce')
	@Public()
	@ApiOperation({ summary: 'Get nonce for signature' })
	@ApiQuery({ name: 'public_address', schema: { type: 'string' }, required: true })
	@ApiOkResponse(joi2swagger(ResponseNonceDto))
	async getNonce(@Query('public_address') publicAddress: string): Promise<ResponseNonceDto> {
		return await this.authService.generateNonce(publicAddress);
	}

	@Post('login')
	@Public()
	@ApiOperation({ summary: 'Authorization' })
	@ApiQuery({ name: 'signup', schema: { type: 'boolean' }, required: false })
	@ApiBody(joi2swagger(AddWalletDto))
	@ApiOkResponse(joi2swagger(ResponseLoginDto))
	async login(@Body() wallet: AddWalletDto, @Query('signup') signup?: boolean): Promise<ResponseLoginDto> {
		return await this.authService.login(wallet.publicAddress, wallet.signature, wallet.blockchain, signup);
	}

	@Post('logout')
	@Public()
	@ApiOperation({ summary: 'Logout' })
	@ApiBody(joi2swagger(RefreshTokenDto))
	@ApiOkResponse({ status: 200 })
	async logout(@Body() body: RefreshTokenDto): Promise<void> {
		await this.authService.logout(body.refreshToken);
	}

	@Put('add-wallet')
	@ApiOperation({ summary: 'Add crypto wallet' })
	@ApiBody(joi2swagger(AddWalletDto))
	@ApiOkResponse(joi2swagger(ResponseCreateEntityDto))
	async addWallet(@Body() wallet: AddWalletDto, @UserId() userId: string): Promise<ResponseCreateEntityDto> {
		return await this.authService.addWallet(wallet.publicAddress, wallet.signature, wallet.blockchain, userId);
	}

	@Post('refresh')
	@Public()
	@ApiOperation({ summary: 'Refresh token' })
	@ApiBody(joi2swagger(RefreshTokenDto))
	@ApiOkResponse(joi2swagger(ResponseJwtDto))
	async refresh(@Body() body: RefreshTokenDto): Promise<ResponseJwtDto> {
		return await this.authService.refresh(body.refreshToken);
	}
}
