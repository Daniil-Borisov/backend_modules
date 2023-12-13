import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import RefreshTokenEntity from 'libs/database/entities/refresh_token.entity';
import UserEntity from 'libs/database/entities/user.entity';
import WalletEntity from 'libs/database/entities/wallet.entity';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Module({
	imports: [
		MikroOrmModule.forFeature([UserEntity, WalletEntity, RefreshTokenEntity]),
		JwtModule.registerAsync({
			useFactory: async (configService: ConfigService) => ({
				secret: configService.get<string>('JWT_SECRET'),
			}),
			inject: [ConfigService],
		}),
	],
	controllers: [AuthController],
	providers: [
		AuthService,
		{
			provide: 'APP_GUARD',
			useClass: AuthGuard,
		},
	],
})
export class AuthModule {}
