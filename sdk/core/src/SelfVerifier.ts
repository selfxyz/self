import msgpack from 'msgpack-lite';
import pako from 'pako';

import { DEFAULT_RPC_URL, TREE_TRACKER_URL, countryNames } from '../../../common/src/constants/constants';
import {
  ArgumentsDisclose,
  ArgumentsProveOffChain,
  ArgumentsRegister,
  DisclosureOptions,
  SelfApp,
  SelfAppPartial,
} from '../../../common/src/utils/appType';
import { UserIdType } from '../../../common/src/utils/circuits/uuid';
import { AttestationVerifier } from './AttestationVerifier';

export class SelfVerifier extends AttestationVerifier {
  constructor(
    scope: string,
    devMode: boolean = false,
    rpcUrl: string = DEFAULT_RPC_URL,
    registryContractAddress: `0x${string}`,
    hubContractAddress: `0x${string}`
  ) {
    super(devMode, rpcUrl, registryContractAddress, hubContractAddress);
    this.scope = scope;
  }

  setTargetRootTimestamp(targetRootTimestamp: number): this {
    this.targetRootTimestamp = targetRootTimestamp;
    return this;
  }

  setMinimumAge(age: number): this {
    if (age < 10) {
      throw new Error('Minimum age must be at least 10 years old');
    }
    if (age > 100) {
      throw new Error('Minimum age must be at most 100 years old');
    }
    this.minimumAge = { enabled: true, value: age.toString() };
    return this;
  }

  setNationality(country: (typeof countryNames)[number]): this {
    this.nationality = { enabled: true, value: country };
    return this;
  }

  discloseNationality(): this {
    this.setNationality('Any');
    return this;
  }

  excludeCountries(...countries: (typeof countryNames)[number][]): this {
    this.excludedCountries = { enabled: true, value: countries };
    return this;
  }

  enableOFACCheck(): this {
    this.ofac = true;
    return this;
  }

  allowMockPassports(): this {
    this.devMode = true;
    return this;
  }

  toDisclosureOptions(): DisclosureOptions {
    return [
      { key: 'minimumAge', ...this.minimumAge },
      { key: 'nationality', ...this.nationality },
      { key: 'excludedCountries', ...this.excludedCountries },
      { key: 'ofac', enabled: this.ofac },
    ];
  }

  // TODO: related to the qr code
  getIntent(appName: string, userId: string, userIdType: UserIdType, sessionId: string): string {
    const intent_raw: SelfAppPartial = {
      appName: appName,
      scope: this.scope,
      sessionId: sessionId,
      userId: userId,
      userIdType: userIdType,
      devMode: this.devMode,
    };

    let selfArguments: ArgumentsProveOffChain | ArgumentsRegister;
    const argsVcAndDisclose: ArgumentsDisclose = {
      disclosureOptions: this.toDisclosureOptions(),
      commitmentMerkleTreeUrl: TREE_TRACKER_URL,
    };
    selfArguments = argsVcAndDisclose;

    const intent: SelfApp = {
      ...intent_raw,
      args: selfArguments,
    };
    const encoded = msgpack.encode(intent);
    try {
      const compressedData = pako.deflate(encoded);
      return btoa(String.fromCharCode(...new Uint8Array(compressedData)));
    } catch (err) {
      console.error(err);
      return '';
    }
  }
}
