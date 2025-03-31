import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';
import { poseidon2 } from 'poseidon-lite';

import {
  API_URL,
  API_URL_STAGING,
  PASSPORT_ATTESTATION_ID,
  WS_RPC_URL_VC_AND_DISCLOSE,
} from '../../../../common/src/constants/constants';
import { SelfApp } from '../../../../common/src/utils/appType';
import { getCircuitNameFromPassportData } from '../../../../common/src/utils/circuits/circuitsName';
import {
  generateCommitment,
  generateNullifier,
} from '../../../../common/src/utils/passports/passport';
import { getLeafDscTree } from '../../../../common/src/utils/trees';
import { PassportData } from '../../../../common/src/utils/types';
import { ProofStatusEnum } from '../../stores/proofProvider';
import { EndpointType } from './../../../../common/src/utils/appType';
import { sendPayload } from './tee';

export type PassportSupportStatus =
  | 'passport_metadata_missing'
  | 'csca_not_found'
  | 'registration_circuit_not_supported'
  | 'dsc_circuit_not_supported'
  | 'passport_supported';

export interface PassportSupportCheckResult {
  status: PassportSupportStatus;
  dscCircuitName?: string;
  registerCircuitName?: string;
  error?: Error;
  endpointType?: EndpointType;
}

export interface RegistrationPayload {
  inputs: any;
  registerCircuitName: string;
  circuitDNSMapping: Record<string, string>;
  endpointType: EndpointType;
}

export interface ofacSMTs {
  passportNoAndNationalitySMT: SMT;
  nameAndDobSMT: SMT;
  nameAndYobSMT: SMT;
}

export function checkPassportSupported(
  passportData: PassportData,
  deployedCircuits: any,
): PassportSupportCheckResult {
  const passportMetadata = passportData.passportMetadata;
  if (!passportMetadata) {
    console.log('Passport metadata is null');
    return {
      status: 'passport_metadata_missing',
      error: new Error(
        `passport metadata is missing for passport with dsc: ${passportData.dsc}`,
      ),
    };
  }
  if (!passportMetadata.cscaFound) {
    console.log('CSCA not found');
    return {
      status: 'csca_not_found',
      error: new Error(
        `csca not found for passport with dsc: ${passportData.dsc}`,
      ),
    };
  }
  const circuitNameRegister = getCircuitNameFromPassportData(
    passportData,
    'register',
  );
  console.log('circuitNameRegister', circuitNameRegister);
  if (
    !circuitNameRegister ||
    !deployedCircuits.REGISTER.includes(circuitNameRegister)
  ) {
    return {
      status: 'registration_circuit_not_supported',
      error: new Error(
        `Registration circuit not supported: ${circuitNameRegister}`,
      ),
      registerCircuitName: circuitNameRegister,
    };
  }
  const circuitNameDsc = getCircuitNameFromPassportData(passportData, 'dsc');
  if (!circuitNameDsc || !deployedCircuits.DSC.includes(circuitNameDsc)) {
    console.log('DSC circuit not supported:', circuitNameDsc);
    return {
      status: 'dsc_circuit_not_supported',
      error: new Error(`dsc circuit not supported: ${circuitNameDsc}`),
      dscCircuitName: circuitNameDsc,
      registerCircuitName: circuitNameRegister,
    };
  }
  console.log('Passport supported');
  return {
    status: 'passport_supported',
    registerCircuitName: circuitNameRegister,
    dscCircuitName: circuitNameDsc,
  };
}

export async function checkIdPassportDscIsInTree(
  passportData: PassportData,
  dscTree: string,
  circuitDNSMapping: Record<string, string>,
  endpointType: EndpointType,
  dscCircuitName: string,
  dscInputs: any,
): Promise<boolean> {
  const hashFunction = (a: any, b: any) => poseidon2([a, b]);
  const tree = LeanIMT.import(hashFunction, dscTree);
  const leaf = getLeafDscTree(
    passportData.dsc_parsed!,
    passportData.csca_parsed!,
  );
  console.log('DSC leaf:', leaf);
  const index = tree.indexOf(BigInt(leaf));
  if (index === -1) {
    console.log('DSC is not found in the tree, sending DSC payload');
    const dscStatus = await sendDscPayload(
      passportData,
      circuitDNSMapping,
      endpointType,
      dscCircuitName,
      dscInputs,
    );
    if (dscStatus !== ProofStatusEnum.SUCCESS) {
      console.log('DSC proof failed');
      return false;
    }
  } else {
    // console.log('DSC i found in the tree, sending DSC payload for debug');
    // const dscStatus = await sendDscPayload(passportData);
    // if (dscStatus !== ProofStatusEnum.SUCCESS) {
    //   console.log('DSC proof failed');
    //   return false;
    // }
    console.log('DSC is found in the tree, skipping DSC payload');
  }
  return true;
}

export async function sendDscPayload(
  passportData: PassportData,
  circuitDNSMapping: Record<string, string>,
  endpointType: EndpointType,
  dscCircuitName: string,
  inputs: any,
): Promise<ProofStatusEnum | false> {
  if (!passportData) {
    return false;
  }
  // const isSupported = checkPassportSupported(passportData);
  // if (!isSupported) {
  //   console.log('Passport not supported');
  //   return false;
  // }
  console.log('sendDscPayload');

  const dscStatus = await sendPayload(
    inputs,
    'dsc',
    dscCircuitName,
    endpointType,
    'https://self.xyz',
    (circuitDNSMapping.DSC as any)[dscCircuitName],
    undefined,
    { updateGlobalOnSuccess: false },
  );
  return dscStatus;
}

export async function sendVcAndDisclosePayload(selfApp: SelfApp, inputs: any) {
  return await sendPayload(
    inputs,
    'vc_and_disclose',
    'vc_and_disclose',
    selfApp.endpointType,
    selfApp.endpoint,
    WS_RPC_URL_VC_AND_DISCLOSE,
    undefined,
    {
      updateGlobalOnSuccess: true,
      updateGlobalOnFailure: true,
      flow: 'disclosure',
    },
  );
}

/*** Logic Flow ****/

export function isUserRegistered(
  passportData: PassportData,
  secret: string,
  serializedTree: string,
) {
  if (!passportData) {
    return false;
  }
  const commitment = generateCommitment(
    secret,
    PASSPORT_ATTESTATION_ID,
    passportData,
  );
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serializedTree);
  const index = tree.indexOf(BigInt(commitment));
  return index !== -1;
}

export async function isPassportNullified(passportData: PassportData) {
  const nullifier = generateNullifier(passportData);
  const nullifierHex = `0x${BigInt(nullifier).toString(16)}`;
  console.log('checking for nullifier', nullifierHex);
  const response = await fetch(`${API_URL}/is-nullifier-onchain/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nullifier: nullifierHex }),
  });
  const data = await response.json();
  console.log('isPassportNullified', data);
  return data.data;
}

export async function getDeployedCircuits() {
  console.log('Fetching deployed circuits from api');
  const response = await fetch(`${API_URL}/deployed-circuits/`);
  if (!response.ok) {
    throw new Error(
      `API server error: ${response.status} ${response.statusText}`,
    );
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    throw new Error(
      'API returned HTML instead of JSON - server may be down or misconfigured',
    );
  }
  try {
    const data = await response.json();

    if (!data.data || !data.data.REGISTER || !data.data.DSC) {
      throw new Error(
        'Invalid data structure received from API: missing REGISTER or DSC fields',
      );
    }
    return data.data;
  } catch (error) {
    throw new Error('API returned invalid JSON response - server may be down');
  }
}
export async function getCircuitDNSMapping(endpointType?: EndpointType) {
  console.log('Fetching deployed circuits from api');
  const baseUrl =
    endpointType === 'celo' || endpointType === 'https'
      ? API_URL
      : API_URL_STAGING;
  const response = await fetch(`${baseUrl}/circuit-dns-mapping/`);
  if (!response.ok) {
    throw new Error(
      `API server error: ${response.status} ${response.statusText}`,
    );
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    throw new Error(
      'API returned HTML instead of JSON - server may be down or misconfigured',
    );
  }
  try {
    const data = await response.json();
    if (!data.data) {
      throw new Error(
        'Invalid data structure received from API: missing data field',
      );
    }
    return data.data;
  } catch (error) {
    throw new Error('API returned invalid JSON response - server may be down');
  }
}
