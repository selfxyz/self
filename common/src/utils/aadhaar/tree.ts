import {
  poseidon9,
  poseidon3,
  poseidon4,
  poseidon2,
  poseidon6,
  poseidon13,
  poseidon12,
} from 'poseidon-lite';
import { ChildNodes, SMT } from '@openpassport/zk-kit-smt';
import { stringToAsciiBigIntArray } from '../circuits/uuid';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { packBytesAndPoseidon } from '../hash';
import { OFAC_TREE_LEVELS } from '../../constants/constants';
import { IMT } from '@openpassport/zk-kit-imt';
import { pad } from '../passports/passport';
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import { EndpointType } from '../appType';
import { DocumentType } from '../types';

countries.registerLocale(en);

// SMT trees for 3 levels of matching :
// 1. Passport Number and Nationality tree : level 3 (Absolute Match)
// 2. Name and date of birth combo tree : level 2 (High Probability Match)
// 3. Name and year of birth combo tree : level 1 (Partial Match)
export function buildSMT(field: any[], treetype: string): [number, number, SMT] {
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
    if (treetype == 'name_and_dob') {
      leaf = processNameAndDob(entry, i);
    } else if (treetype == 'name_and_yob') {
      leaf = processNameAndYob(entry, i);
    } else if (treetype == 'country') {
      const keys = Object.keys(entry);
      leaf = processCountry(keys[0], entry[keys[0]], i);
    }

    if (leaf == BigInt(0) || tree.createProof(leaf).membership) {
      console.log('This entry already exists in the tree, skipping...');
      continue;
    }

    count += 1;
    tree.add(leaf, BigInt(1));
  }

  console.log('Total', treetype, 'paresed are : ', count, ' over ', field.length);
  console.log(treetype, 'tree built in', performance.now() - startTime, 'ms');
  return [count, performance.now() - startTime, tree];
}

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

function generateSmallKey(input: bigint): bigint {
  return input % (BigInt(1) << BigInt(OFAC_TREE_LEVELS));
}

function processNameAndDob(entry: any, i: number): bigint {
  const firstName = entry.First_Name;
  const lastName = entry.Last_Name;
  const day = entry.day;
  const month = entry.month;
  const year = entry.year;
  if (day == null || month == null || year == null) {
    console.log('dob is null', i, entry);
    return BigInt(0);
  }
  const nameHash = processNameAadhaar(firstName, lastName, i);
  console.log(nameHash);
  const dobHash = processDob(day, month, year, i);

  return generateSmallKey(poseidon2([dobHash, nameHash]));
}

function processNameAndYob(entry: any, i: number): bigint {
  const firstName = entry.First_Name;
  const lastName = entry.Last_Name;
  const year = entry.year;
  if (year == null) {
    console.log('year is null', i, entry);
    return BigInt(0);
  }
  const nameHash = processNameAadhaar(firstName, lastName, i);
  const yearHash = processYear(year, i);
  return generateSmallKey(poseidon2([yearHash, nameHash]));
}

function processYear(year: string, i: number): bigint {
  year = year.slice(-2);
  const yearArr = stringToAsciiBigIntArray(year);
  return getYearLeaf(yearArr);
}

function getYearLeaf(yearArr: (bigint | number)[]): bigint {
  return poseidon2(yearArr);
}

function processNameAadhaar(firstName: string, lastName: string, i: number): bigint {
  // LASTNAME<<FIRSTNAME<MIDDLENAME<<<... (6-44)
  firstName = firstName.replace(/'/g, '');
  firstName = firstName.replace(/\./g, '');
  firstName = firstName.replace(/[- ]/g, '<');
  lastName = lastName.replace(/'/g, '');
  lastName = lastName.replace(/[- ]/g, '<');
  lastName = lastName.replace(/\./g, '');
  // Removed apostrophes from the first name, eg O'Neil -> ONeil
  // Replace spaces and hyphens with '<' in the first name, eg John Doe -> John<Doe
  // TODO : Handle special cases like malaysia : no two filler characters like << for surname and givenname
  // TODO : Verify rules for . in names. eg : J. Doe (Done same as apostrophe for now)

  let arr = lastName + '<<' + firstName;
  if (arr.length > 39) {
    arr = arr.substring(0, 39);
  } else {
    while (arr.length < 39) {
      arr += '<';
    }
  }
  //TODO pad till 256
  let nameArr = stringToAsciiBigIntArray(arr);
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

  month = monthMap[month.toLowerCase()];
  year = year.slice(-2);
  const dob = year + month + day;
  let arr = stringToAsciiBigIntArray(dob);
  return getDobLeaf(arr, i);
}

function processCountry(country1: string, country2: string, i: number) {
  let arr = stringToAsciiBigIntArray(country1);
  let arr2 = stringToAsciiBigIntArray(country2);

  const leaf = getCountryLeaf(arr, arr2, i);
  if (!leaf) {
    console.log('Error creating leaf value', i, country1, country2);
    return BigInt(0);
  }
  return leaf;
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

export function getNameDobLeaf(
  nameMrz: (bigint | number)[],
  dobMrz: (bigint | number)[],
  i?: number
): bigint {
  return generateSmallKey(poseidon2([getDobLeaf(dobMrz), getNameLeaf(nameMrz)]));
}

export function getNameYobLeaf(
  nameMrz: (bigint | number)[],
  yobMrz: (bigint | number)[],
  i?: number
): bigint {
  return generateSmallKey(poseidon2([getYearLeaf(yobMrz), getNameLeaf(nameMrz)]));
}

export function getNameLeaf(nameMrz: (bigint | number)[], i?: number): bigint {
  let middleChunks: bigint[] = [];
  let chunks: (number | bigint)[][] = [];

  chunks.push(nameMrz.slice(0, 13), nameMrz.slice(13, 26), nameMrz.slice(26, 39)); // 39/3 for posedion to digest

  for (const chunk of chunks) {
    middleChunks.push(poseidon13(chunk));
  }

  try {
    return poseidon3(middleChunks);
  } catch (err) {
    console.log('err : Name', err, i, nameMrz);
  }
}

export function getDobLeaf(dobMrz: (bigint | number)[], i?: number): bigint {
  if (dobMrz.length !== 6) {
    console.log('parsed dob length is not 9:', i, dobMrz);
    return;
  }
  try {
    return poseidon6(dobMrz);
  } catch (err) {
    console.log('err : Dob', err, i, dobMrz);
  }
}
