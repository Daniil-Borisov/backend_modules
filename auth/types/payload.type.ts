export class PayloadType {
	public readonly user: string;
	public readonly s?: string;

	constructor(userId: string, refreshTokenId?: string) {
		this.user = userId;
		this.s = refreshTokenId;
	}
}
