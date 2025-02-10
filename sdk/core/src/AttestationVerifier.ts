import {
  countryNames,
} from '../../../common/src/constants/constants';
import type { SelfAttestation } from '../../../common/src/utils/selfAttestation';
import {
  parsePublicSignalsDisclose,
} from '../../../common/src/utils/selfAttestation';
import {
  formatForbiddenCountriesListFromCircuitOutput,
  getAttributeFromUnpackedReveal,
  unpackReveal,
} from '../../../common/src/utils/circuits/formatOutputs';
import { castToScope } from '../../../common/src/utils/circuits/uuid';
import { SelfVerifierReport } from './SelfVerifierReport';
import {
  registryAbi
} from "./abi/IdentityRegistryImplV1";
import {
  verifyAllAbi
} from "./abi/VerifyAll";
import { ethers } from 'ethers';
// import type { VcAndDiscloseHubProofStruct } from "../../../common/src/utils/contracts/typechain-types/contracts/IdentityVerificationHubImplV1.sol/IdentityVerificationHubImplV1";
import {
  groth16,
  Groth16Proof,
  PublicSignals
} from 'snarkjs';
import { CIRCUIT_CONSTANTS, revealedDataTypes } from '../../../common/src/constants/constants';

export class AttestationVerifier {

  protected devMode: boolean;
  protected scope: string;
  protected report: SelfVerifierReport;
  protected attestationId: number = 1;
  protected targetRootTimestamp: number = 0;

  protected minimumAge: { enabled: boolean; value: string } = { enabled: false, value: '18' };
  protected excludedCountries: { enabled: boolean; value: (typeof countryNames)[number][] } = {
    enabled: false,
    value: [],
  };
  protected ofac: boolean = false;

  protected registryContract: any;
  protected verifyAllContract: any;

  constructor(
    devMode: boolean = false,
    rpcUrl: string,
    registryContractAddress: `0x${string}`,
    verifyAllContractAddress: `0x${string}`,
    targetRootTimestamp: number = 0
  ) {
    this.devMode = devMode;
    this.report = new SelfVerifierReport();
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.registryContract = new ethers.Contract(registryContractAddress, registryAbi, provider);
    this.verifyAllContract = new ethers.Contract(verifyAllContractAddress, verifyAllAbi, provider);
    this.targetRootTimestamp = targetRootTimestamp;
  }

  public async verify(proof: Groth16Proof, publicSignals: PublicSignals): Promise<SelfAttestation> {

    const solidityProof = await groth16.exportSolidityCallData(
      proof,
      publicSignals,
    );

    const vcAndDiscloseHubProof: any = {
      olderThanEnabled: this.minimumAge.enabled,
      olderThan: BigInt(this.minimumAge.value),
      forbiddenCountriesEnabled: this.excludedCountries.enabled,
      forbiddenCountriesListPacked: BigInt(this.excludedCountries.value.length),
      ofacEnabled: this.ofac,
      vcAndDiscloseProof: solidityProof
    }


    const result = await this.verifyAllContract.verifyAll(
      this.targetRootTimestamp,
      vcAndDiscloseHubProof,
      [
        revealedDataTypes.issuing_state,
        revealedDataTypes.name,
        revealedDataTypes.passport_number,
        revealedDataTypes.nationality,
        revealedDataTypes.date_of_birth,
        revealedDataTypes.gender,
        revealedDataTypes.expiry_date,
      ]
    );

    console.log(result);

    const credentialSubject = {
      userId: "",
      application: this.scope,
      merkle_root: "",
      attestation_id: "",
      current_date: "",
      issuing_state: result[0],
      name: result[1],
      passport_number: result[2],
      nationality: result[3],
      date_of_birth: result[4],
      gender: result[5],
      expiry_date: result[6],
      older_than: result[7],
      valid: result[8],
      nullifier: publicSignals[CIRCUIT_CONSTANTS.REGISTER_NULLIFIER_INDEX],
    }

    const attestation: SelfAttestation = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'SelfAttestation'],
      issuer: 'https://selfattestation.com',
      issuanceDate: new Date().toISOString(),
      credentialSubject: credentialSubject,
      proof: {
        type: "Groth16Proof",
        verificationMethod: "Vc and Disclose",
        value: {
          proof: proof,
          publicSignals: publicSignals,
        },
        vkey: "",
      }
    }

    return attestation;
    
  }

}
