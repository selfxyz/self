import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import {
  API_URL,
  formatMrz,
  generateCommitment,
  generateNullifier,
  getCircuitNameFromPassportData,
  getLeafDscTree,
  Hash,
  ID_CARD_ATTESTATION_ID,
  parseCertificateSimple,
  PASSPORT_ATTESTATION_ID,
  type PassportData,
} from '@selfxyz/common';
import { DocumentCategory } from '@selfxyz/common';
import { poseidon2, poseidon5 } from 'poseidon-lite';

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
  const document: DocumentCategory = passportData.documentCategory;
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
  const deployedCircuits =
    useProtocolStore.getState()[document].deployed_circuits; // change this to the document type
  if (
    !circuitNameRegister ||
    !(
      deployedCircuits.REGISTER.includes(circuitNameRegister) ||
      deployedCircuits.REGISTER_ID.includes(circuitNameRegister)
    )
  ) {
    return {
      status: 'registration_circuit_not_supported',
      details: circuitNameRegister,
    };
  }
  const circuitNameDsc = getCircuitNameFromPassportData(passportData, 'dsc');
  if (
    !circuitNameDsc ||
    !(
      deployedCircuits.DSC.includes(circuitNameDsc) ||
      deployedCircuits.DSC_ID.includes(circuitNameDsc)
    )
  ) {
    console.log('DSC circuit not supported:', circuitNameDsc);
    return { status: 'dsc_circuit_not_supported', details: circuitNameDsc };
  }
  console.log('Passport supported');
  return { status: 'passport_supported', details: 'null' };
}

export async function isUserRegistered(
  passportData: PassportData,
  secret: string,
) {
  if (!passportData) {
    return false;
  }
  const attestationId =
    passportData.documentCategory === 'passport'
      ? PASSPORT_ATTESTATION_ID
      : ID_CARD_ATTESTATION_ID;
  const commitment = generateCommitment(secret, attestationId, passportData);
  const document: DocumentCategory = passportData.documentCategory;
  const serializedTree = useProtocolStore.getState()[document].commitment_tree;
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serializedTree);
  const index = tree.indexOf(BigInt(commitment));
  return index !== -1;
}

export async function isUserRegisteredWithAlternativeCSCA(
  passportData: PassportData,
  secret: string,
): Promise<{ isRegistered: boolean; csca: string | null }> {
  if (!passportData) {
    console.error('Passport data is null');
    return { isRegistered: false, csca: null };
  }
  const alternativeCSCA = useProtocolStore.getState().passport.alternative_csca;
  console.log('alternativeCSCA: ', alternativeCSCA);
  const { commitment_list, csca_list } = generateCommitmentInApp(
    secret,
    PASSPORT_ATTESTATION_ID,
    passportData,
    alternativeCSCA,
  );

  if (commitment_list.length === 0) {
    console.error(
      'No valid CSCA certificates could be parsed from alternativeCSCA',
    );
    return { isRegistered: false, csca: null };
  }

  const serializedTree = useProtocolStore.getState().passport.commitment_tree;
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serializedTree);
  for (let i = 0; i < commitment_list.length; i++) {
    const commitment = commitment_list[i];
    const index = tree.indexOf(BigInt(commitment));
    if (index !== -1) {
      return { isRegistered: true, csca: csca_list[i] };
    }
  }
  console.warn(
    'None of the following CSCA correspond to the commitment:',
    csca_list,
  );
  return { isRegistered: false, csca: null };
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

export async function checkIfPassportDscIsInTree(
  passportData: PassportData,
  dscTree: string,
): Promise<boolean> {
  const hashFunction = (a: any, b: any) => poseidon2([a, b]);
  const tree = LeanIMT.import(hashFunction, dscTree);
  const leaf = getLeafDscTree(
    passportData.dsc_parsed!,
    passportData.csca_parsed!,
  );
  const index = tree.indexOf(BigInt(leaf));
  if (index === -1) {
    console.log('DSC not found in the tree');
    return false;
  } else {
    console.log('DSC found in the tree');
    return true;
  }
}

export function generateCommitmentInApp(
  secret: string,
  attestation_id: string,
  passportData: PassportData,
  alternativeCSCA: Record<string, string>,
) {
  const dg1_packed_hash = Hash.packBytesAndPoseidon(
    formatMrz(passportData.mrz),
  );
  const eContent_packed_hash = Hash.packBytesAndPoseidon(
    (
      Hash.hash(
        passportData.passportMetadata!.eContentHashFunction,
        Array.from(passportData.eContent),
        'bytes',
      ) as number[]
    )
      // eslint-disable-next-line no-bitwise
      .map(byte => byte & 0xff),
  );

  const csca_list: string[] = [];
  const commitment_list: string[] = [];

  for (const [cscaKey, cscaValue] of Object.entries(alternativeCSCA)) {
    try {
      const formattedCsca = formatCSCAPem(cscaValue);
      const cscaParsed = parseCertificateSimple(formattedCsca);

      const commitment = poseidon5([
        secret,
        attestation_id,
        dg1_packed_hash,
        eContent_packed_hash,
        getLeafDscTree(passportData.dsc_parsed!, cscaParsed),
      ]).toString();

      csca_list.push(formatCSCAPem(cscaValue));
      commitment_list.push(commitment);
    } catch (error) {
      console.warn(
        `Failed to parse CSCA certificate for key ${cscaKey}:`,
        error,
      );
    }
  }

  if (commitment_list.length === 0) {
    console.error('No valid CSCA certificates found in alternativeCSCA');
  }

  return { commitment_list, csca_list };
}

function formatCSCAPem(cscaPem: string): string {
  let cleanedPem = cscaPem.trim();

  if (!cleanedPem.includes('-----BEGIN CERTIFICATE-----')) {
    cleanedPem = cleanedPem.replace(/[^A-Za-z0-9+/=]/g, '');
    try {
      Buffer.from(cleanedPem, 'base64');
    } catch (error) {
      throw new Error(`Invalid base64 certificate data: ${error}`);
    }
    cleanedPem = `-----BEGIN CERTIFICATE-----\n${cleanedPem}\n-----END CERTIFICATE-----`;
  }
  return cleanedPem;
}
