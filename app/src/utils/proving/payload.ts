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
import { useProtocolStore } from '../../stores/protocolStore';

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
  const deployedCircuits = useProtocolStore.getState().passport.deployed_circuits;
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
    (useProtocolStore.getState().passport.circuits_dns_mapping as any).REGISTER[circuitName],
    undefined,
    {
      updateGlobalOnSuccess: true,
      updateGlobalOnFailure: true,
      flow: 'registration',
    },
  );
}

export async function checkIdPassportDscIsInTree(
  passportData: PassportData,
  endpointType: EndpointType,
): Promise<boolean> {
  const hashFunction = (a: any, b: any) => poseidon2([a, b]);
  const tree = LeanIMT.import(hashFunction, useProtocolStore.getState().passport.dsc_tree);
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
      useProtocolStore.getState().passport.circuits_dns_mapping,
      endpointType,
    );
    if (dscStatus.status !== ProofStatusEnum.SUCCESS) {
      console.log('DSC proof failed');
      return false;
    }
  } else {
    console.log('DSC is found in the tree, skipping DSC payload');
  }
  return true;
}

export async function sendDscPayload(
  passportData: PassportData,
  circuitDNSMapping: Record<string, string>,
  endpointType: EndpointType,
): Promise<{ status: ProofStatusEnum; error_code?: string; reason?: string }> {
  if (!passportData) {
    return { status: ProofStatusEnum.FAILURE };
  }
  // const isSupported = checkPassportSupported(passportData);
  // if (!isSupported) {
  //   console.log('Passport not supported');
  //   return false;
  // }
  const { inputs, circuitName } = await generateTeeInputsDsc(
    passportData
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
  const serializedTree = useProtocolStore.getState().passport.commitment_tree;
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
  const endpointType =
    passportData.documentType && passportData.documentType === 'mock_passport'
      ? 'staging_celo'
      : 'celo';
  const dscOk = await checkIdPassportDscIsInTree(
    passportData,
    endpointType,
  );
  if (!dscOk) {
    return;
  }
  await sendRegisterPayload(
    passportData,
    secret,
    endpointType,
  );
}

// export async function getDeployedCircuits(documentType: string) {
//   console.log('Fetching deployed circuits from api');
//   const baseUrl =
//     !documentType ||
//     typeof documentType !== 'string' ||
//     documentType === 'passport'
//       ? API_URL
//       : API_URL_STAGING;
//   const response = await fetch(`${baseUrl}/deployed-circuits/`);
//   if (!response.ok) {
//     throw new Error(
//       `API server error: ${response.status} ${response.statusText}`,
//     );
//   }
//   const contentType = response.headers.get('content-type');
//   if (contentType && contentType.includes('text/html')) {
//     throw new Error(
//       'API returned HTML instead of JSON - server may be down or misconfigured',
//     );
//   }
//   try {
//     const data = await response.json();

//     if (!data.data || !data.data.REGISTER || !data.data.DSC) {
//       throw new Error(
//         'Invalid data structure received from API: missing REGISTER or DSC fields',
//       );
//     }
//     return data.data;
//   } catch (error) {
//     throw new Error('API returned invalid JSON response - server may be down');
//   }
// }

// export async function getCircuitDNSMapping(endpointType?: EndpointType) {
//   console.log('Fetching deployed circuits from api');
//   const baseUrl =
//     endpointType === 'celo' || endpointType === 'https'
//       ? API_URL
//       : API_URL_STAGING;
//   const response = await fetch(`${baseUrl}/circuit-dns-mapping/`);

//   if (!response.ok) {
//     throw new Error(
//       `API server error: ${response.status} ${response.statusText}`,
//     );
//   }
//   const contentType = response.headers.get('content-type');
//   if (contentType && contentType.includes('text/html')) {
//     throw new Error(
//       'API returned HTML instead of JSON - server may be down or misconfigured',
//     );
//   }
//   try {
//     const data = await response.json();
//     if (!data.data) {
//       throw new Error(
//         'Invalid data structure received from API: missing data field',
//       );
//     }
//     return data.data;
//   } catch (error) {
//     throw new Error('API returned invalid JSON response - server may be down');
//   }
// }
