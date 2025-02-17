import { BigNumberish } from 'ethers';

export function parseSolidityCalldata<T>(rawCallData: string, _type: T): T {
  const parsed = JSON.parse('[' + rawCallData + ']');

  return {
    a: parsed[0].map((x: string) => x.replace(/"/g, '')) as [BigNumberish, BigNumberish],
    b: parsed[1].map((arr: string[]) => arr.map((x: string) => x.replace(/"/g, ''))) as [
      [BigNumberish, BigNumberish],
      [BigNumberish, BigNumberish],
    ],
    c: parsed[2].map((x: string) => x.replace(/"/g, '')) as [BigNumberish, BigNumberish],
    pubSignals: parsed[3].map((x: string) => x.replace(/"/g, '')) as BigNumberish[],
  } as T;
}
