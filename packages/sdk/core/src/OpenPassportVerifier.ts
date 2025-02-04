import {
  ArgumentsDisclose,
  ArgumentsProveOffChain,
  ArgumentsProveOnChain,
  ArgumentsRegister,
  Mode,
  OpenPassportAppPartial,
  OpenPassportApp
} from '../../../common/src/utils/appType';
import {
  DEFAULT_RPC_URL,
  MODAL_SERVER_ADDRESS,
  WEBSOCKET_URL,
  countryNames,
} from '../../../common/src/constants/constants';
import { UserIdType } from '../../../common/src/utils/utils';
import * as pako from 'pako';
import msgpack from 'msgpack-lite';
import { AttestationVerifier } from './AttestationVerifier';
export class OpenPassportVerifier extends AttestationVerifier {
  private mode: Mode;

  private modalServerUrl: string = MODAL_SERVER_ADDRESS;
  private rpcUrl: string = DEFAULT_RPC_URL;
  private cscaMerkleTreeUrl: string = '';

  constructor(mode: Mode, scope: string, devMode: boolean = false) {
    super(devMode);
    this.mode = mode;
    this.scope = scope;
  }

  // Disclose
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

  // Register
  setModalServerUrl(modalServerUrl: string): this {
    this.modalServerUrl = modalServerUrl;
    return this;
  }

  setCommitmentMerkleTreeUrl(commitmentMerkleTreeUrl: string): this {
    this.commitmentMerkleTreeUrl = commitmentMerkleTreeUrl;
    return this;
  }

  // On chain
  setRpcUrl(rpcUrl: string): this {
    this.rpcUrl = rpcUrl;
    return this;
  }

  allowMockPassports(): this {
    this.devMode = true;
    return this;
  }

  getIntent(
    appName: string,
    userId: string,
    userIdType: UserIdType,
    sessionId: string,
    websocketUrl: string = WEBSOCKET_URL
  ): string {
    const intent_raw: OpenPassportAppPartial = {
      appName: appName,
      mode: this.mode,
      scope: this.scope,
      websocketUrl: websocketUrl,
      sessionId: sessionId,
      userId: userId,
      userIdType: userIdType,
      devMode: this.devMode,
    };

    let openPassportArguments: ArgumentsProveOffChain | ArgumentsRegister;
    switch (this.mode) {
      case 'prove_onchain':
        const argsProveOnChain: ArgumentsProveOnChain = {
          disclosureOptions: {
            minimumAge: this.minimumAge,
            nationality: this.nationality,
            excludedCountries: this.excludedCountries,
            ofac: this.ofac,
          },
          modalServerUrl: this.modalServerUrl,
          merkleTreeUrl: this.cscaMerkleTreeUrl,
        };
        openPassportArguments = argsProveOnChain;
        break;
      case 'prove_offchain':
        const argsProveOffChain: ArgumentsProveOffChain = {
          disclosureOptions: {
            minimumAge: this.minimumAge,
            nationality: this.nationality,
            excludedCountries: this.excludedCountries,
            ofac: this.ofac,
          },
        };
        openPassportArguments = argsProveOffChain;
        break;
      case 'register':
        if (!this.commitmentMerkleTreeUrl) {
          throw new Error("Commitment merkle tree URL is required for mode 'register'");
        }
        const argsRegisterOnChain: ArgumentsRegister = {
          modalServerUrl: this.modalServerUrl,
          cscaMerkleTreeUrl: this.cscaMerkleTreeUrl,
          commitmentMerkleTreeUrl: this.commitmentMerkleTreeUrl,
        };
        openPassportArguments = argsRegisterOnChain;
        break;
      case 'vc_and_disclose':
        const argsVcAndDisclose: ArgumentsDisclose = {
          disclosureOptions: {
            minimumAge: this.minimumAge,
            nationality: this.nationality,
            excludedCountries: this.excludedCountries,
            ofac: this.ofac,
          },
          commitmentMerkleTreeUrl: this.commitmentMerkleTreeUrl,
        };
        openPassportArguments = argsVcAndDisclose;
        break;
    }

    const intent: OpenPassportApp = {
      ...intent_raw,
      args: openPassportArguments,
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
