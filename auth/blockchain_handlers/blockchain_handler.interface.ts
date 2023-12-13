export interface BlockchainHandler {
	isValidPublicAddress(publicAddress: string): boolean;
	getPublicAddressBySignature(signature: string, nonce: string): string;
}
