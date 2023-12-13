import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PayloadType } from './types/payload.type';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private readonly jwtService: JwtService, private reflector: Reflector) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [context.getHandler(), context.getClass()]) ?? false;

		const req = context.switchToHttp().getRequest();
		const authHeader = req.headers['authorization'];

		if (authHeader == undefined || authHeader.startsWith('Bearer ') == false) {
			if (isPublic == false) {
				throw new UnauthorizedException('Not access');
			}

			return true;
		}

		const token = authHeader.substring(7, authHeader.length);

		try {
			const payload = await this.jwtService.verifyAsync<PayloadType>(token);

			req.userId = payload.user;
			req.refreshTokenId = payload.s;

			if (payload.s != undefined) {
				throw new UnauthorizedException('Need access token');
			}

			return true;
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}

			throw new UnauthorizedException('JWT expired');
		}
	}
}
