import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { poseidon2 } from 'poseidon-lite';

import {
  API_URL,
  PASSPORT_ATTESTATION_ID,
  WS_RPC_URL_VC_AND_DISCLOSE,
} from '../../../../common/src/constants/constants';
import { EndpointType, SelfApp } from '../../../../common/src/utils/appType';
import { getCircuitNameFromPassportData } from '../../../../common/src/utils/circuits/circuitsName';
import {
  generateCommitment,
  generateNullifier,
} from '../../../../common/src/utils/passports/passport';
import {
  getCommitmentTree,
  getDSCTree,
  getLeafDscTree,
} from '../../../../common/src/utils/trees';
import { PassportData } from '../../../../common/src/utils/types';
import { ProofStatusEnum } from '../../stores/proofProvider';
import {
  generateTeeInputsDsc,
  generateTeeInputsRegister,
  generateTeeInputsVCAndDisclose,
} from './inputs';
import { sendPayload } from './tee';

export type PassportSupportStatus =
  | 'passport_metadata_missing'
  | 'csca_not_found'
  | 'registration_circuit_not_supported'
  | 'dsc_circuit_not_supported'
  | 'passport_supported';
export async function checkPassportSupported(
  passportData: PassportData,
): Promise<{
  status: PassportSupportStatus;
  details: string;
}> {
  const passportMetadata = passportData.passportMetadata;
  if (!passportMetadata) {
    console.log('Passport metadata is null');
    return { status: 'passport_metadata_missing', details: passportData.dsc };
  }
  if (!passportMetadata.cscaFound) {
    console.log('CSCA not found');
    return { status: 'csca_not_found', details: passportData.dsc };
  }
  const circuitNameRegister = getCircuitNameFromPassportData(
    passportData,
    'register',
  );
  const deployedCircuits = await getDeployedCircuits();
  console.log('circuitNameRegister', circuitNameRegister);
  if (
    !circuitNameRegister ||
    !deployedCircuits.REGISTER.includes(circuitNameRegister)
  ) {
    return {
      status: 'registration_circuit_not_supported',
      details: circuitNameRegister,
    };
  }
  const circuitNameDsc = getCircuitNameFromPassportData(passportData, 'dsc');
  if (!circuitNameDsc || !deployedCircuits.DSC.includes(circuitNameDsc)) {
    console.log('DSC circuit not supported:', circuitNameDsc);
    return { status: 'dsc_circuit_not_supported', details: circuitNameDsc };
  }
  console.log('Passport supported');
  return { status: 'passport_supported', details: 'null' };
}

export async function sendRegisterPayload(
  passportData: PassportData,
  secret: string,
  circuitDNSMapping: Record<string, string>,
  endpointType: EndpointType,
) {
  const { inputs, circuitName } = await generateTeeInputsRegister(
    secret,
    passportData,
    endpointType,
  );
  await sendPayload(
    inputs,
    'register',
    circuitName,
    endpointType,
    'https://self.xyz',
    (circuitDNSMapping as any).REGISTER[circuitName],
    undefined,
    {
      updateGlobalOnSuccess: true,
      updateGlobalOnFailure: true,
      flow: 'registration',
    },
  );
}

async function checkIdPassportDscIsInTree(
  passportData: PassportData,
  dscTree: string,
  circuitDNSMapping: Record<string, string>,
  endpointType: EndpointType,
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
): Promise<ProofStatusEnum | false> {
  if (!passportData) {
    return false;
  }
  // const isSupported = checkPassportSupported(passportData);
  // if (!isSupported) {
  //   console.log('Passport not supported');
  //   return false;
  // }
  const { inputs, circuitName } = await generateTeeInputsDsc(
    passportData,
    endpointType,
  );

  const dscStatus = await sendPayload(
    inputs,
    'dsc',
    circuitName,
    endpointType,
    'https://self.xyz',
    (circuitDNSMapping.DSC as any)[circuitName],
    undefined,
    { updateGlobalOnSuccess: false },
  );
  return dscStatus;
}

export async function sendVcAndDisclosePayload(
  secret: string,
  passportData: PassportData | null,
  selfApp: SelfApp,
) {
  if (!passportData) {
    return null;
  }
  const { inputs, circuitName } = await generateTeeInputsVCAndDisclose(
    secret,
    passportData,
    selfApp,
  );
  return await sendPayload(
    inputs,
    'vc_and_disclose',
    circuitName,
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

export async function isUserRegistered(
  passportData: PassportData,
  secret: string,
) {
  if (!passportData) {
    return false;
  }
  const commitment = generateCommitment(
    secret,
    PASSPORT_ATTESTATION_ID,
    passportData,
  );
  const serializedTree = await getCommitmentTree(passportData.documentType);
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

export async function registerPassport(
  passportData: PassportData,
  secret: string,
) {
  // First get the mapping, then use it for the check
  const endpointType =
    passportData.documentType && passportData.documentType === 'mock_passport'
      ? 'staging_celo'
      : 'celo';
  const [circuitDNSMapping, dscTree] = await Promise.all([
    getCircuitDNSMapping(),
    getDSCTree(endpointType),
  ]);
  console.log('circuitDNSMapping', circuitDNSMapping);
  const dscOk = await checkIdPassportDscIsInTree(
    passportData,
    dscTree,
    circuitDNSMapping,
    endpointType,
  );
  if (!dscOk) {
    return;
  }
  await sendRegisterPayload(
    passportData,
    secret,
    circuitDNSMapping,
    endpointType,
  );
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
export async function getCircuitDNSMapping() {
  console.log('Fetching deployed circuits from api');
  const response = await fetch(`${API_URL}/circuit-dns-mapping/`);
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
        'Invalid data structure received from API: missing REGISTER or DSC fields',
      );
    }
    return data.data;
  } catch (error) {
    throw new Error('API returned invalid JSON response - server may be down');
  }
}
