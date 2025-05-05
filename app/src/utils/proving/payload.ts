import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { poseidon2 } from 'poseidon-lite';
import { v4 as uuidv4 } from 'uuid';

import {
  API_URL,
  API_URL_STAGING,
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
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

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
  const deployedCircuits = await getDeployedCircuits(passportData.documentType);
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
  sessionId?: string,
  onPayloadSent?: () => void,
) {
  const { inputs, circuitName } = await generateTeeInputsRegister(
    secret,
    passportData,
    endpointType,
  );
  return await sendPayload(
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
      sessionId,
      onPayloadSent,
    },
  );
}

async function checkIdPassportDscIsInTree(
  passportData: PassportData,
  dscTree: string,
  circuitDNSMapping: Record<string, string>,
  endpointType: EndpointType,
  deviceToken?: string,
  statusCallback?: (status: string, canClose: boolean) => void
): Promise<{ dscOk: boolean; dscSessionId?: string }> {
  const hashFunction = (a: any, b: any) => poseidon2([a, b]);
  const tree = LeanIMT.import(hashFunction, dscTree);
  const leaf = getLeafDscTree(
    passportData.dsc_parsed!,
    passportData.csca_parsed!,
  );
  const index = tree.indexOf(BigInt(leaf));
  
  if (index === -1) {
    statusCallback?.('Your DSC is not registered. sending DSC payload...', false);
    console.log('DSC is not found in the tree, sending DSC payload');
    
    const dscSessionId = uuidv4();
    
    await registerDeviceToken(dscSessionId, endpointType, deviceToken);
    
    const dscStatus = await sendDscPayload(
      passportData,
      circuitDNSMapping,
      endpointType,
      dscSessionId,
      () => statusCallback?.('DSC verification started. You can close the app now. Pls come back when your dsc is verified', true)
    );
    
    if (dscStatus.status !== ProofStatusEnum.SUCCESS) {
      console.log('DSC proof failed');
      return { dscOk: false };
    }
    
    return { dscOk: true, dscSessionId };
  } else {
    console.log('DSC is found in the tree, skipping DSC payload');
    return { dscOk: true };
  }
}

export async function sendDscPayload(
  passportData: PassportData,
  circuitDNSMapping: Record<string, string>,
  endpointType: EndpointType,
  sessionId?: string,
  onPayloadSent?: () => void,
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
    { 
      updateGlobalOnSuccess: false,
      sessionId,
      onPayloadSent,
    },
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

export async function registerPassportWithStatus(
  passportData: PassportData,
  secret: string,
  sessionId?: string,
  deviceToken?: string,
  statusCallback?: (status: string, canClose: boolean) => void
) {
  // First get the mapping, then use it for the check
  const endpointType = passportData.documentType && passportData.documentType === 'mock_passport'
    ? 'staging_celo'
    : 'celo';
  
  statusCallback?.('Checking if your DSC is registered...', false);
  
  const [circuitDNSMapping, dscTree] = await Promise.all([
    getCircuitDNSMapping(endpointType),
    getDSCTree(endpointType),
  ]);
  
  console.log('circuitDNSMapping', circuitDNSMapping);
  
  // Use the shared function for DSC checking
  const { dscOk, dscSessionId } = await checkIdPassportDscIsInTree(
    passportData,
    dscTree,
    circuitDNSMapping,
    endpointType,
    deviceToken,
    statusCallback
  );
  
  if (!dscOk) {
    return { status: ProofStatusEnum.FAILURE };
  }
  
  // もしDSCの処理でsessionIdが生成されていない場合は
  // initialSessionIdを使用するか、新しいsessionIdを生成する
  const registerSessionId = sessionId || uuidv4();
  
  // デバイストークンを登録
  if (registerSessionId !== dscSessionId) {
    await registerDeviceToken(registerSessionId, endpointType, deviceToken);
  }
  
  // Send registration payload with callback
  statusCallback?.('Sending your passport payload...', false);
  const registerResult = await sendRegisterPayload(
    passportData,
    secret,
    circuitDNSMapping,
    endpointType,
    registerSessionId,
    () => statusCallback?.('Passport registration started. You can close the app now. We will notify once your passport is registered.', true)
  );
  
  return registerResult;
}

export async function getDeployedCircuits(documentType: string) {
  console.log('Fetching deployed circuits from api');
  const baseUrl =
    !documentType ||
    typeof documentType !== 'string' ||
    documentType === 'passport'
      ? API_URL
      : API_URL_STAGING;
  const response = await fetch(`${baseUrl}/deployed-circuits/`);
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

async function registerDeviceToken(
  sessionId: string, 
  endpointType: EndpointType,
  deviceToken?: string
): Promise<void> {
  try {
    // deviceTokenが提供されていない場合のみ取得を試みる
    let token = deviceToken;
    if (!token) {
      token = await messaging().getToken();
      if (!token) {
        console.log('No FCM token available');
        return;
      }
    }

    const cleanedToken = token.trim();
    const baseUrl = endpointType === 'celo' || endpointType === 'https'
      ? API_URL
      // : API_URL_STAGING;
      : "https://4abf-133-3-201-48.ngrok-free.app";
    
    const deviceTokenRegistration = {
      session_id: sessionId,
      device_token: cleanedToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    };

    if (cleanedToken.length > 10) {
      console.log(
        'Registering device token:',
        `${cleanedToken.substring(0, 5)}...${cleanedToken.substring(
          cleanedToken.length - 5,
        )}`,
      );
    }

    const response = await fetch(`${baseUrl}/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(deviceTokenRegistration),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to register device token:', response.status, errorText);
    } else {
      console.log('Device token registered successfully with session_id:', sessionId);
    }
  } catch (error) {
    console.error('Error registering device token:', error);
  }
}
