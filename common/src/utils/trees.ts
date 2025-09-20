import countries from 'i18n-iso-countries';
// @ts-ignore
import en from 'i18n-iso-countries/langs/en.json' with { type: 'json' };
import {
  poseidon2,
  poseidon3,
  poseidon5,
  poseidon6,
  poseidon10,
  poseidon12,
  poseidon13,
} from 'poseidon-lite';

import {
  CSCA_TREE_DEPTH,
  DSC_TREE_DEPTH,
  max_csca_bytes,
  max_dsc_bytes,
  OFAC_TREE_LEVELS,
} from '../constants/constants.js';
import { packBytes } from './bytes.js';
import type { CertificateData } from './certificate_parsing/dataStructure.js';
import { parseCertificateSimple } from './certificate_parsing/parseCertificateSimple.js';
import { stringToAsciiBigIntArray } from './circuits/uuid.js';
import { packBytesAndPoseidon } from './hash.js';
import { pad } from './passports/passport.js';
import {
  DscCertificateMetaData,
  parseDscCertificateData,
} from './passports/passport_parsing/parseDscCertificateData.js';

import { IMT } from '@openpassport/zk-kit-imt';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import type { ChildNodes } from '@openpassport/zk-kit-smt';
import { SMT } from '@openpassport/zk-kit-smt';

// SideEffect here
countries.registerLocale(en);

//---------------------------
// AADHAAR
//---------------------------
export function buildAadhaarSMT(field: any[], treetype: string): [number, number, SMT] {
  let count = 0;
  let startTime = performance.now();

  const hash2 = (childNodes: ChildNodes) =>
    childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes);
  const tree = new SMT(hash2, true);

  for (let i = 0; i < field.length; i++) {
    const entry = field[i];

    if (i !== 0) {
      console.log('Processing', treetype, 'number', i, 'out of', field.length);
    }

    let leaf = BigInt(0);
    let reverse_leaf = BigInt(0);
    if (treetype == 'name_and_dob') {
      leaf = processNameAndDobAadhaar(entry, i);
      reverse_leaf = processNameAndDobAadhaar(entry, i, true);
    } else if (treetype == 'name_and_yob') {
      leaf = processNameAndYobAadhaar(entry, i);
      reverse_leaf = processNameAndYobAadhaar(entry, i, true);
    }

    if (leaf == BigInt(0) || tree.createProof(leaf).membership) {
      console.log('This entry already exists in the tree, skipping...');
      continue;
    }

    count += 1;
    tree.add(leaf, BigInt(1));
    if (reverse_leaf == BigInt(0) || tree.createProof(reverse_leaf).membership) {
      console.log('This entry already exists in the tree, skipping...');
      continue;
    }
    tree.add(reverse_leaf, BigInt(1));
    count += 1;
  }

  return [count, performance.now() - startTime, tree];
}

// SMT trees for 3 levels of matching :
// 1. Passport Number and Nationality tree : level 3 (Absolute Match)
// 2. Name and date of birth combo tree : level 2 (High Probability Match)
// 3. Name and year of birth combo tree : level 1 (Partial Match)
// NEW: ID card specific trees
export function buildSMT(field: any[], treetype: string): [number, number, SMT] {
  let count = 0;
  const startTime = performance.now();

  const hash2 = (childNodes: ChildNodes) =>
    childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes);
  const tree = new SMT(hash2, true);

  for (let i = 0; i < field.length; i++) {
    const entry = field[i];

    // Optimization: Log progress less frequently
    if (i !== 0 && i % 100 === 0) {
      console.log('Processing', treetype, 'number', i, 'out of', field.length);
    }

    let leaf = BigInt(0);
    // Determine document type based on treetype for name processing
    let docType: 'passport' | 'id_card' = 'passport'; // Default to passport
    if (treetype.endsWith('_id_card')) {
      docType = 'id_card';
    }

    if (treetype == 'passport_no_and_nationality') {
      leaf = processPassportNoAndNationality(entry.Pass_No, entry.Pass_Country, i);
    } else if (treetype == 'name_and_dob') {
      leaf = processNameAndDob(entry, i, 'passport'); // Explicitly passport
    } else if (treetype == 'name_and_yob') {
      leaf = processNameAndYob(entry, i, 'passport'); // Explicitly passport
    } else if (treetype == 'name_and_dob_id_card') {
      // New ID card type
      leaf = processNameAndDob(entry, i, 'id_card');
    } else if (treetype == 'name_and_yob_id_card') {
      // New ID card type
      leaf = processNameAndYob(entry, i, 'id_card');
    } else if (treetype == 'country') {
      const keys = Object.keys(entry);
      leaf = processCountry(keys[0], entry[keys[0]], i);
    }

    if (leaf == BigInt(0)) {
      // Skip entries that couldn't be processed (e.g., missing data)
      continue;
    }

    // Check for duplicates *after* processing, as different inputs might yield the same hash
    if (tree.createProof(leaf).membership) {
      // console.log('Duplicate leaf generated, skipping entry:', i, entry); // Optional: log duplicates
      continue;
    }

    count += 1;
    tree.add(leaf, BigInt(1));
  }

  console.log('Total', treetype, 'entries added:', count, 'out of', field.length);
  console.log(treetype, 'tree built in', (performance.now() - startTime).toFixed(2), 'ms');
  return [count, performance.now() - startTime, tree];
}

export function formatRoot(root: string): string {
  const rootHex = BigInt(root).toString(16);
  return rootHex.length % 2 === 0 ? '0x' + rootHex : '0x0' + rootHex;
}

export function generateMerkleProof(imt: LeanIMT, _index: number, maxleaf_depth: number) {
  const { siblings: siblings, index } = imt.generateProof(_index);
  const leaf_depth = siblings.length;
  // The index must be converted to a list of indices, 1 for each tree level.
  // The circuit tree leaf_depth is 20, so the number of siblings must be 20, even if
  // the tree leaf_depth is actually 3. The missing siblings can be set to 0, as they
  // won't be used to calculate the root in the circuit.
  const path: number[] = [];

  for (let i = 0; i < maxleaf_depth; i += 1) {
    path.push((index >> i) & 1);
    if (siblings[i] === undefined) {
      siblings[i] = BigInt(0);
    }
  }
  return { siblings, path, leaf_depth };
}

export function generateSMTProof(smt: SMT, leaf: bigint) {
  const { entry, matchingEntry, siblings, root, membership } = smt.createProof(leaf);
  const leaf_depth = siblings.length;

  let closestleaf;
  if (!matchingEntry) {
    // we got the 0 leaf or membership
    // then check if entry[1] exists
    if (!entry[1]) {
      // non membership proof
      closestleaf = BigInt(0); // 0 leaf
    } else {
      closestleaf = BigInt(entry[0]); // leaf itself (memb proof)
    }
  } else {
    // non membership proof
    closestleaf = BigInt(matchingEntry[0]); // actual closest
  }

  // PATH, SIBLINGS manipulation as per binary tree in the circuit
  siblings.reverse();
  while (siblings.length < OFAC_TREE_LEVELS) siblings.push(BigInt(0));

  // ----- Useful for debugging hence leaving as comments -----
  // const binary = entry[0].toString(2)
  // const bits = binary.slice(-leaf_depth);
  // let indices = bits.padEnd(256, "0").split("").map(Number)
  // const pathToMatch = num2Bits(256,BigInt(entry[0]))
  // while(indices.length < 256) indices.push(0);
  // // CALCULATED ROOT FOR TESTING
  // // closestleaf, leaf_depth, siblings, indices, root : needed
  // let calculatedNode = poseidon3([closestleaf,1,1]);
  // console.log("Initial node while calculating",calculatedNode)
  // console.log(smt.verifyProof(smt.createProof(leaf)))
  // for (let i= 0; i < leaf_depth ; i++) {
  //   const childNodes: any = indices[i] ? [siblings[i], calculatedNode] : [calculatedNode, siblings[i]]
  //   console.log(indices[i],childNodes)
  //   calculatedNode = poseidon2(childNodes)
  // }
  // console.log("Actual node", root)
  // console.log("calculated node", calculatedNode)
  // -----------------------------------------------------------

  return {
    root,
    leaf_depth,
    closestleaf,
    siblings,
  };
}

export function getCountryLeaf(
  country_by: (bigint | number)[],
  country_to: (bigint | number)[],
  i?: number
): bigint {
  if (country_by.length !== 3 || country_to.length !== 3) {
    console.log('parsed passport length is not 3:', i, country_to, country_by);
    return;
  }
  try {
    const country = country_by.concat(country_to);
    return poseidon6(country);
  } catch (err) {
    console.log('err : sanc_country hash', err, i, country_by, country_to);
  }
}

export function getCscaTreeInclusionProof(leaf: string, _serialized_csca_tree: any[][]) {
  const tree = new IMT(poseidon2, CSCA_TREE_DEPTH, 0, 2);
  tree.setNodes(_serialized_csca_tree);
  const index = tree.indexOf(leaf);
  if (index === -1) {
    throw new Error('Your public key was not found in the registry');
  }
  const proof = tree.createProof(index);
  return [
    tree.root,
    proof.pathIndices.map((index) => index.toString()),
    proof.siblings.flat().map((sibling) => sibling.toString()),
  ];
}

export function getCscaTreeRoot(serialized_csca_tree: any[][]) {
  const tree = new IMT(poseidon2, CSCA_TREE_DEPTH, 0, 2);
  tree.setNodes(serialized_csca_tree);
  return tree.root;
}

export function getDobLeaf(dobMrz: (bigint | number)[], i?: number): bigint {
  if (dobMrz.length !== 6) {
    // console.log('parsed dob length is not 6:', i, dobMrz); // Corrected length check message
    return BigInt(0); // Return 0 for invalid length
  }
  try {
    return poseidon6(dobMrz);
  } catch (err) {
    console.error('Error in getDobLeaf:', err, 'Index:', i, 'DOB MRZ:', dobMrz); // Use console.error
    return BigInt(0); // Return 0 on error
  }
}

export function getDscTreeInclusionProof(
  leaf: string,
  serialized_dsc_tree: string
): [string, number[], bigint[], number] {
  const hashFunction = (a: any, b: any) => poseidon2([a, b]);
  const tree = LeanIMT.import(hashFunction, serialized_dsc_tree);
  const index = tree.indexOf(BigInt(leaf));
  if (index === -1) {
    throw new Error('Your public key was not found in the registry');
  }
  const { siblings, path, leaf_depth } = generateMerkleProof(tree, index, DSC_TREE_DEPTH);
  return [tree.root, path, siblings, leaf_depth];
}

/** get leaf for DSC and CSCA Trees */
export function getLeaf(parsed: CertificateData, type: 'dsc' | 'csca'): string {
  if (type === 'dsc') {
    // for now, we pad it for sha
    const tbsArray = Object.keys(parsed.tbsBytes).map((key) => parsed.tbsBytes[key]);
    const [paddedTbsBytes, tbsBytesPaddedLength] = pad(parsed.hashAlgorithm)(
      tbsArray,
      max_dsc_bytes
    );
    const dsc_hash = packBytesAndPoseidon(Array.from(paddedTbsBytes));

    return poseidon2([dsc_hash, tbsArray.length]).toString();
  } else {
    const tbsBytesArray = Array.from(parsed.tbsBytes);
    const paddedTbsBytesArray = tbsBytesArray.concat(
      new Array(max_csca_bytes - tbsBytesArray.length).fill(0)
    );
    const csca_hash = packBytesAndPoseidon(paddedTbsBytesArray);
    return poseidon2([csca_hash, tbsBytesArray.length]).toString();
  }
}

export function getLeafCscaTree(csca_parsed: CertificateData): string {
  return getLeaf(csca_parsed, 'csca');
}

function processPassportNoAndNationality(
  passno: string,
  nationality: string,
  index: number
): bigint {
  if (passno.length > 9) {
    console.log('passport number length is greater than 9:', index, passno);
  } else if (passno.length < 9) {
    while (passno.length != 9) {
      passno += '<';
    }
  }

  const countryCode = getCountryCode(nationality);
  if (!countryCode) {
    console.log('Error getting country code', index, nationality);
    return BigInt(0);
  }
  console.log('nationality and countryCode', nationality, countryCode);

  const leaf = getPassportNumberAndNationalityLeaf(
    stringToAsciiBigIntArray(passno),
    stringToAsciiBigIntArray(countryCode),
    index
  );
  if (!leaf) {
    console.log('Error creating leaf value', index, passno, nationality);
    return BigInt(0);
  }
  return leaf;
}

// this is a temporary workaround for some of the country name,
// will be removed once we parse the OFAC list better, starting from the XML file.
const normalizeCountryName = (country: string): string => {
  const mapping: Record<string, string> = {
    palestinian: 'Palestine',
    'korea, north': 'North Korea',
    'korea, south': 'Korea, Republic of',
    'united kingdom': 'United Kingdom',
    syria: 'Syrian Arab Republic',
    burma: 'Myanmar',
    'cabo verde': 'Cape Verde',
    'congo, democratic republic of the': 'Democratic Republic of the Congo',
    macau: 'Macao',
  };
  return mapping[country.toLowerCase()] || country;
};

const getCountryCode = (countryName: string): string | undefined => {
  return countries.getAlpha3Code(normalizeCountryName(countryName), 'en');
};

function generateSmallKey(input: bigint): bigint {
  return input % (BigInt(1) << BigInt(OFAC_TREE_LEVELS));
}

function processNameAndDob(entry: any, i: number, docType: 'passport' | 'id_card'): bigint {
  const firstName = entry.First_Name;
  const lastName = entry.Last_Name;
  const day = entry.day;
  const month = entry.month;
  const year = entry.year;
  if (day == null || month == null || year == null || !firstName || !lastName) {
    // Added checks for name presence
    // console.log('Name or DOB data missing for name_and_dob', i, entry); // Optional: log missing data
    return BigInt(0);
  }
  const targetLength = docType === 'passport' ? 39 : 30;
  const nameHash = processName(firstName, lastName, targetLength, i);
  if (nameHash === BigInt(0)) return BigInt(0); // Propagate error
  const dobHash = processDob(day, month, year, i);
  if (dobHash === BigInt(0)) return BigInt(0); // Propagate error

  return generateSmallKey(poseidon2([dobHash, nameHash]));
}

function processNameAndYob(entry: any, i: number, docType: 'passport' | 'id_card'): bigint {
  const firstName = entry.First_Name;
  const lastName = entry.Last_Name;
  const year = entry.year;
  if (year == null || !firstName || !lastName) {
    // Added checks for name presence
    // console.log('Name or YOB data missing for name_and_yob', i, entry); // Optional: log missing data
    return BigInt(0);
  }
  const targetLength = docType === 'passport' ? 39 : 30;
  const nameHash = processName(firstName, lastName, targetLength, i);
  if (nameHash === BigInt(0)) return BigInt(0); // Propagate error
  const yearHash = processYear(year, i);
  if (yearHash === BigInt(0)) return BigInt(0); // Propagate error

  return generateSmallKey(poseidon2([yearHash, nameHash]));
}

function processYear(year: string, i: number): bigint {
  if (!year || typeof year !== 'string' || year.length < 2) {
    // console.log('Invalid year format for processYear', i, year); // Optional: log error
    return BigInt(0);
  }
  const yearSuffix = year.slice(-2);
  const yearArr = stringToAsciiBigIntArray(yearSuffix);
  return getYearLeaf(yearArr);
}

function getYearLeaf(yearArr: (bigint | number)[]): bigint {
  if (yearArr.length !== 2) {
    // console.log('Invalid year array length for getYearLeaf', yearArr); // Optional: log error
    return BigInt(0);
  }
  try {
    return poseidon2(yearArr);
  } catch (err) {
    // console.log('err : Year hash', err, yearArr); // Optional: log error
    return BigInt(0);
  }
}

function processName(
  firstName: string,
  lastName: string,
  targetLength: 30 | 39,
  i: number
): bigint {
  // LASTNAME<<FIRSTNAME<MIDDLENAME<<<...
  // Ensure names are strings before processing
  const cleanFirstName =
    typeof firstName === 'string'
      ? firstName.replace(/'/g, '').replace(/\./g, '').replace(/[- ]/g, '<')
      : '';
  const cleanLastName =
    typeof lastName === 'string'
      ? lastName.replace(/'/g, '').replace(/[- ]/g, '<').replace(/\./g, '')
      : '';

  // Handle cases where one name might be missing
  let arr = (cleanLastName ? cleanLastName + '<<' : '') + cleanFirstName;

  if (arr.length === 0) {
    // console.log('Cannot process empty name string', i); // Optional: log error
    return BigInt(0);
  }

  // Pad or truncate to target length
  if (arr.length > targetLength) {
    arr = arr.substring(0, targetLength);
  } else {
    while (arr.length < targetLength) {
      arr += '<';
    }
  }
  console.log('arr', arr, 'arr.length', arr.length);
  const nameArr = stringToAsciiBigIntArray(arr);
  // getNameLeaf will select the correct Poseidon hash based on nameArr.length
  return getNameLeaf(nameArr, i);
}

function processDob(day: string, month: string, year: string, i: number): bigint {
  // YYMMDD
  const monthMap: { [key: string]: string } = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
  };

  const lowerMonth = typeof month === 'string' ? month.toLowerCase() : '';
  const mappedMonth = monthMap[lowerMonth];

  if (
    !mappedMonth ||
    !day ||
    typeof day !== 'string' ||
    day.length !== 2 ||
    !year ||
    typeof year !== 'string' ||
    year.length < 2
  ) {
    // console.log('Invalid DOB component format for processDob', i, {day, month, year}); // Optional: log error
    return BigInt(0);
  }

  const yearSuffix = year.slice(-2);
  const dob = yearSuffix + mappedMonth + day;
  const arr = stringToAsciiBigIntArray(dob);
  return getDobLeaf(arr, i);
}

function processCountry(country1: string, country2: string, i: number) {
  const arr = stringToAsciiBigIntArray(country1);
  const arr2 = stringToAsciiBigIntArray(country2);

  const leaf = getCountryLeaf(arr, arr2, i);
  if (!leaf) {
    console.log('Error creating leaf value', i, country1, country2);
    return BigInt(0);
  }
  return leaf;
}

export function getLeafDscTree(dsc_parsed: CertificateData, csca_parsed: CertificateData): string {
  const dscLeaf = getLeaf(dsc_parsed, 'dsc');
  const cscaLeaf = getLeaf(csca_parsed, 'csca');
  return poseidon2([dscLeaf, cscaLeaf]).toString();
}

export function getLeafDscTreeFromDscCertificateMetadata(
  dscParsed: CertificateData,
  dscMetaData: DscCertificateMetaData
): string {
  // TODO: WRONG  change this function using raw dsc and hashfunctions from passportMetadata
  const cscaParsed = parseCertificateSimple(dscMetaData.csca);
  return getLeafDscTree(dscParsed, cscaParsed);
}

export function getLeafDscTreeFromParsedDsc(dscParsed: CertificateData): string {
  return getLeafDscTreeFromDscCertificateMetadata(dscParsed, parseDscCertificateData(dscParsed));
}

export function getNameDobLeaf(
  nameMrz: (bigint | number)[],
  dobMrz: (bigint | number)[],
  i?: number
): bigint {
  return generateSmallKey(poseidon2([getDobLeaf(dobMrz), getNameLeaf(nameMrz)]));
}

export const getNameDobLeafAadhaar = (name: string, year: string, month: string, day: string) => {
  const paddedName = name
    .toUpperCase()
    .padEnd(62, '\0')
    .split('')
    .map((char) => char.charCodeAt(0));
  const namePacked = packBytes(paddedName);
  return generateSmallKey(
    poseidon5([namePacked[0], namePacked[1], BigInt(year), BigInt(month), BigInt(day)])
  );
};

export function getNameLeaf(nameMrz: (bigint | number)[], i?: number): bigint {
  const middleChunks: bigint[] = [];
  const chunks: (number | bigint)[][] = [];
  try {
    // Add try-catch block
    if (nameMrz.length == 39) {
      // passport
      chunks.push(nameMrz.slice(0, 13), nameMrz.slice(13, 26), nameMrz.slice(26, 39));
      for (const chunk of chunks) {
        if (chunk.length !== 13)
          throw new Error(`Invalid chunk length for Poseidon13: ${chunk.length}`);
        middleChunks.push(poseidon13(chunk));
      }
    } else if (nameMrz.length == 30) {
      // id_card
      chunks.push(nameMrz.slice(0, 10), nameMrz.slice(10, 20), nameMrz.slice(20, 30)); // Corrected comment: 30/3 for poseidon10
      for (const chunk of chunks) {
        if (chunk.length !== 10)
          throw new Error(`Invalid chunk length for Poseidon10: ${chunk.length}`);
        middleChunks.push(poseidon10(chunk));
      }
    } else {
      throw new Error(`Unsupported name MRZ length: ${nameMrz.length}`); // Handle unexpected lengths
    }

    if (middleChunks.length !== 3)
      throw new Error(`Invalid number of middle chunks: ${middleChunks.length}`);
    return poseidon3(middleChunks);
  } catch (err) {
    console.error('Error in getNameLeaf:', err, 'Index:', i, 'MRZ Length:', nameMrz.length); // Use console.error for errors
    // console.log('MRZ data:', nameMrz); // Optional: log failing data
    return BigInt(0); // Return 0 on error
  }
}

export function getNameYobLeaf(
  nameMrz: (bigint | number)[],
  yobMrz: (bigint | number)[],
  i?: number
): bigint {
  return generateSmallKey(poseidon2([getYearLeaf(yobMrz), getNameLeaf(nameMrz)]));
}

const processNameAndDobAadhaar = (entry: any, i: number, reverse: boolean = false): bigint => {
  let firstName = entry.First_Name;
  let lastName = entry.Last_Name;
  if (reverse) {
    firstName = entry.Last_Name;
    lastName = entry.First_Name;
  }

  const day = entry.day;
  const month = entry.month;
  const year = entry.year;

  if (day == null || month == null || year == null) {
    console.log('dob is null', i, entry);
    return BigInt(0);
  }

  const name = processNameAadhaar(firstName, lastName);
  const dob = processDobAadhaar(year, month, day);

  return generateSmallKey(poseidon5([name[0], name[1], dob[0], dob[1], dob[2]]));
};

const processNameAndYobAadhaar = (entry: any, i: number, reverse: boolean = false): bigint => {
  let firstName = entry.First_Name;
  let lastName = entry.Last_Name;
  if (reverse) {
    firstName = entry.Last_Name;
    lastName = entry.First_Name;
  }

  const year = entry.year;
  if (year == null) {
    console.log('year is null', i, entry);
    return BigInt(0);
  }

  const name = processNameAadhaar(firstName, lastName);
  return generateSmallKey(poseidon3([name[0], name[1], BigInt(year)]));
};

const processNameAadhaar = (firstName: string, lastName: string): bigint[] => {
  const nameArr = (firstName + ' ' + lastName)
    .padEnd(62, '\0')
    .split('')
    .map((char) => char.charCodeAt(0));
  return packBytes(nameArr);
};

const processDobAadhaar = (year: string, month: string, day: string): bigint[] => {
  const monthMap: { [key: string]: string } = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
  };

  month = monthMap[month.toLowerCase()];

  return [year, month, day].map(BigInt);
};

export const getNameYobLeafAahaar = (name: string, year: string) => {
  const paddedName = name
    .toUpperCase()
    .padEnd(62, '\0')
    .split('')
    .map((char) => char.charCodeAt(0));
  const namePacked = packBytes(paddedName);

  return generateSmallKey(poseidon3([namePacked[0], namePacked[1], BigInt(year)]));
};

export function getPassportNumberAndNationalityLeaf(
  passport: (bigint | number)[],
  nationality: (bigint | number)[],
  i?: number
): bigint {
  if (passport.length !== 9) {
    console.log('parsed passport length is not 9:', i, passport);
    return;
  }
  if (nationality.length !== 3) {
    console.log('parsed nationality length is not 3:', i, nationality);
    return;
  }
  try {
    const fullHash = poseidon12(passport.concat(nationality));
    return generateSmallKey(fullHash);
  } catch (err) {
    console.log('err : passport', err, i, passport);
  }
}
