import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { poseidon2, poseidon5 } from 'poseidon-lite';

import {
  API_URL,
  PASSPORT_ATTESTATION_ID,
} from '../../../../common/src/constants/constants';
import { parseCertificateSimple } from '../../../../common/src/utils/certificate_parsing/parseCertificateSimple';
import { getCircuitNameFromPassportData } from '../../../../common/src/utils/circuits/circuitsName';
import { hash, packBytesAndPoseidon } from '../../../../common/src/utils/hash';
import { formatMrz } from '../../../../common/src/utils/passports/format';
import {
  generateCommitment,
  generateNullifier,
} from '../../../../common/src/utils/passports/passport';
import { getLeafDscTree } from '../../../../common/src/utils/trees';
import { PassportData } from '../../../../common/src/utils/types';
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
  const deployedCircuits =
    useProtocolStore.getState().passport.deployed_circuits;
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
  const serializedTree = useProtocolStore.getState().passport.commitment_tree;
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serializedTree);
  for (const commitment of commitment_list) {
    const index = tree.indexOf(BigInt(commitment));
    if (index !== -1) {
      return { isRegistered: true, csca: csca_list[index] };
    }
  }
  console.error(
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
  console.log('DSC leaf:', leaf);
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
  const dg1_packed_hash = packBytesAndPoseidon(formatMrz(passportData.mrz));
  const eContent_packed_hash = packBytesAndPoseidon(
    (
      hash(
        passportData.passportMetadata!.eContentHashFunction,
        Array.from(passportData.eContent),
        'bytes',
      ) as number[]
    ).map(byte => byte % 256),
  );
  const csca_list = Object.keys(alternativeCSCA);
  const commitment_list = Object.values(alternativeCSCA).map(cscaValue =>
    poseidon5([
      secret,
      attestation_id,
      dg1_packed_hash,
      eContent_packed_hash,
      getLeafDscTree(
        passportData.dsc_parsed!,
        parseCertificateSimple(formatCSCAPem(cscaValue)),
      ),
    ]).toString(),
  );
  return { commitment_list, csca_list };
}

function formatCSCAPem(cscaPem: string) {
  if (!cscaPem.includes('-----BEGIN CERTIFICATE-----')) {
    cscaPem = `-----BEGIN CERTIFICATE-----\n${cscaPem}\n-----END CERTIFICATE-----`;
  }
  return cscaPem;
}
