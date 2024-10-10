import { ArgumentsProveOffChain, ArgumentsRegisterOffChain, ArgumentsRegisterOnChain, Mode, OpenPassportAppPartial } from "../../common/src/utils/appType";
import { DEFAULT_RPC_URL, MODAL_SERVER_ADDRESS, WEBSOCKET_URL, countryNames } from "../../common/src/constants/constants";
import { OpenPassportApp } from "../../common/src/utils/appType";
import { UserIdType } from "../../common/src/utils/utils";
import * as pako from 'pako';
import msgpack from 'msgpack-lite';
import { OpenPassportAttestation } from "./index.web";
export class OpenPassportVerifier {
  private mode: Mode;
  private scope: string;
  private minimumAge: { enabled: boolean; value: number } = { enabled: false, value: 0 };
  private nationality: { enabled: boolean; value: typeof countryNames[number] } = { enabled: false, value: '' as typeof countryNames[number] };
  private excludedCountries: { enabled: boolean; value: typeof countryNames[number][] } = { enabled: false, value: [] };
  private ofac: boolean = false;
  private modalServerUrl: string = MODAL_SERVER_ADDRESS;
  private rpcUrl: string = DEFAULT_RPC_URL;
  private cscaMerkleTreeUrl: string = "";
  private devMode: boolean = false;

  constructor(mode: Mode, scope: string) {
    this.mode = mode;
    this.scope = scope;
  }

  // Disclose
  setMinimumAge(age: number): this {
    this.minimumAge = { enabled: true, value: age };
    return this;
  }

  setNationality(country: typeof countryNames[number]): this {
    this.nationality = { enabled: true, value: country };
    return this;
  }

  excludeCountries(...countries: typeof countryNames[number][]): this {
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

  // On chain
  setRpcUrl(rpcUrl: string): this {
    this.rpcUrl = rpcUrl;
    return this;
  }

  setDevMode(devMode: boolean): this {
    this.devMode = devMode;
    return this;
  }

  getIntent(appName: string, userId: string, userIdType: UserIdType, sessionId: string, websocketUrl: string = WEBSOCKET_URL): string {
    const intent_raw: OpenPassportAppPartial = {
      appName: appName,
      mode: this.mode,
      scope: this.scope,
      websocketUrl: websocketUrl,
    };

    let openPassportArguments: ArgumentsProveOffChain | ArgumentsRegisterOnChain;
    switch (this.mode) {
      case "prove_offchain":
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
      case "register":
        const argsRegisterOnChain: ArgumentsRegisterOnChain = {
          modalServerUrl: this.modalServerUrl,
          cscaMerkleTreeUrl: this.cscaMerkleTreeUrl,
          rpcUrl: this.rpcUrl,
        };
        openPassportArguments = argsRegisterOnChain;
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

  verify(attestation: OpenPassportAttestation): boolean {
    return true;
  }
}

