import * as ethUtil from 'ethereumjs-util';
import { BlockchainHandler } from './blockchain_handler.interface';

export class EthereumHandler implements BlockchainHandler {
	isValidPublicAddress(publicAddress: string): boolean {
		return ethUtil.isValidAddress(publicAddress);
	}

	getPublicAddressBySignature(signature: string, nonce: string): string {
		const hexString = ethUtil.fromUtf8(nonce);
		const msgBuffer = ethUtil.toBuffer(hexString);
		const msgHash = ethUtil.hashPersonalMessage(msgBuffer);
		const signatureParams = ethUtil.fromRpcSig(signature);
		const publicKey = ethUtil.ecrecover(msgHash, signatureParams.v, signatureParams.r, signatureParams.s);
		const addressBuffer = ethUtil.publicToAddress(publicKey);
		const address = ethUtil.bufferToHex(addressBuffer);

		return address;
	}
}
