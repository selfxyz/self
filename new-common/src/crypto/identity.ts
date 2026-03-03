import { ethers } from 'ethers';

export function calculateUserIdentifierHash(
  destChainID: number,
  userID: string,
  userDefinedData: string,
): bigint {
  const solidityPackedUserContextData = getSolidityPackedUserContextData(
    destChainID,
    userID,
    userDefinedData,
  );
  const inputBytes = Buffer.from(solidityPackedUserContextData.slice(2), 'hex');
  const sha256Hash = ethers.sha256(inputBytes);
  const ripemdHash = ethers.ripemd160(sha256Hash);
  return BigInt(ripemdHash);
}

export function getSolidityPackedUserContextData(
  destChainID: number,
  userID: string,
  userDefinedData: string,
): string {
  const userIdHex = userID.replace(/-/g, '');
  return ethers.solidityPacked(
    ['bytes32', 'bytes32', 'bytes'],
    [
      ethers.zeroPadValue(ethers.toBeHex(destChainID), 32),
      ethers.zeroPadValue(userIdHex.startsWith('0x') ? userIdHex : '0x' + userIdHex, 32),
      ethers.toUtf8Bytes(userDefinedData),
    ],
  );
}
