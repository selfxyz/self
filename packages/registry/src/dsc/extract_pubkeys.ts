import * as fs from 'fs';
import * as util from 'util';
import { exec } from 'child_process';
const execAsync = util.promisify(exec);

// Extract public keys from pem certicates
const numCertificates = fs.readdirSync('outputs/certificates/').length;
const concurrencyLimit = 500; // Number of tasks to run at once

const publicKeysParsed: {
  signatureAlgorithm: string,
  modulus?: string,
  exponent?: string,
  publicKeyAlgorithm?: string
  publicKeyBit?: string
  pub?: string
  fieldType?: string
  prime?: string
  a?: string
  b?: string
  generator?: string
  order?: string
  cofactor?: string
}[] = [];

async function main() {
  for (let i = 0; i < numCertificates; i += concurrencyLimit) {
    const tasks: any = [];
    for (let j = 0; j < concurrencyLimit && i + j < numCertificates; j++) {
      tasks.push(extractPubkey(i + j));
    }
    await Promise.all(tasks);
  }

  // console.log('publicKeysParsed 0', publicKeysParsed[0]);
  const filteredPublicKeysParsed = publicKeysParsed.filter(item => item !== null);
  fs.writeFileSync('outputs/public_keys_parsed.json', JSON.stringify(filteredPublicKeysParsed, null, 2));
  fs.copyFileSync('outputs/public_keys_parsed.json', '../common/pubkeys/public_keys_parsed.json');
  console.log("public_keys_parsed.json written!")
}

async function extractPubkey(i: number): Promise<void> {
  try {
    const certTextres = await execAsync(`openssl x509 -text -in outputs/certificates/certificate_${i}.pem`);
    const certText = certTextres.stdout as string;
    const signatureAlgorithm = (certText.match(/Signature Algorithm: (.*)/) as RegExpExecArray)[1].trim();

    // console.log('certText', certText)
    
    const issuerRegex = /Issuer: ([^\n]+)/;
    const issuer = extractData(issuerRegex, certText);

    // console.log('issuer', issuer)

    const pubkey = parsePubkey(certText, signatureAlgorithm);

    if (!pubkey) {
      console.error(`Failed to extract data from certificate ${i}`);
      return;
    }

    publicKeysParsed[i] = {
      signatureAlgorithm,
      issuer,
      ...pubkey,
    }
  } catch (error) {
    console.error(`Failed to extract data from certificate ${i}: ${error}`);
  }
}

function parsePubkey(certText: string, signatureAlgorithm: string): any {
  if (
    signatureAlgorithm.includes("sha256WithRSAEncryption")
    || signatureAlgorithm.includes("rsassaPss")
    || signatureAlgorithm.includes("sha1WithRSAEncryption")
    || signatureAlgorithm.includes("sha512WithRSAEncryption")
    ) {
    const modulusRegex = /Modulus:\s+([0-9a-f:\s]+?)\s+Exponent:/;
    const exponentRegex = /Exponent:\s+(\d+)/;
    
    const modulusMatch = certText.match(modulusRegex);
    const exponentMatch = certText.match(exponentRegex);
    
    const modulusHex = modulusMatch ? modulusMatch[1].replace(/[\s:]/g, '') : '';
    const exponent = exponentMatch ? exponentMatch[1] : '';
    
    if (!modulusHex) {
      console.error(`Modulus not found`);
      return null;
    }

    if (Number(exponent) !== 65537) {
      console.error(`signatureAlgorithm`, signatureAlgorithm, `exponent`, exponent);
      return null;
    }
    return {
      modulus: BigInt('0x' + modulusHex).toString(),
      exponent: exponent
    };
  } else if (
    signatureAlgorithm.includes("ecdsa-with-SHA1")
    || signatureAlgorithm.includes("ecdsa-with-SHA384")
    || signatureAlgorithm.includes("ecdsa-with-SHA256")
    || signatureAlgorithm.includes("ecdsa-with-SHA512")
    ) {

    const publicKeyAlgorithmRegex = /Public Key Algorithm: ([^\n]+)/;
    const publicKeyBitRegex = /Public-Key: \((\d+) bit\)/;
    const pubRegex = /pub:\n([0-9A-Fa-f:\n ]+?)\n\s{4}/;
    const fieldTypeRegex = /Field Type: ([^\n]+)/;
    const primeRegex = /Prime:\n([0-9A-Fa-f:\n ]+?)\n\s{4}/;
    const aRegex = /A:\s+\n([0-9A-Fa-f:\n ]+?)\n\s{4}/;
    const bRegex = /B:\s+\n([0-9A-Fa-f:\n ]+?)\n\s{4}/;
    const generatorRegex = /Generator \(uncompressed\):\n([0-9A-Fa-f:\n ]+?)\n\s{4}/;
    const orderRegex = /Order: \n([0-9A-Fa-f:\n ]+?)\n\s{4}/;
    const cofactorRegex = /Cofactor:\s+(\d+)/;

    // Extracting fields
    const publicKeyAlgorithm = extractData(publicKeyAlgorithmRegex, certText);
    const publicKeyBit = extractData(publicKeyBitRegex, certText);
    const pub = extractData(pubRegex, certText);
    const fieldType = extractData(fieldTypeRegex, certText);
    const prime = extractData(primeRegex, certText);
    const a = extractData(aRegex, certText);
    const b = extractData(bRegex, certText);
    const generator = extractData(generatorRegex, certText);
    const order = extractData(orderRegex, certText);
    const cofactor = extractData(cofactorRegex, certText);

    if (!prime) {
      console.error(`Prime not found`);
      return null;
    }
    
    return {
      publicKeyAlgorithm: publicKeyAlgorithm,
      publicKeyBit: publicKeyBit,
      pub: hexToDecimal(pub as string),
      fieldType: fieldType,
      prime: hexToDecimal(prime as string),
      a: hexToDecimal(a as string),
      b: hexToDecimal(b as string),
      generator: hexToDecimal(generator as string),
      order: hexToDecimal(order as string),
      cofactor: cofactor,
    };
  };
}

function extractData(regex: RegExp, text: string): string | null {
  const match = text.match(regex);
  return match ? match[1].trim().replace(/\n/g, '') : null;
}

function hexToDecimal(hexString: string): string {
  return BigInt("0x" + hexString.replace(/[\n: ]/g, '')).toString();
}

main();

// Signature Algorithm and an example of occurence:
// sha256WithRSAEncryption 0
// rsassaPss 317
// sha1WithRSAEncryption 493
// ecdsa-with-SHA1
// ecdsa-with-SHA384 3298
// ecdsa-with-SHA256 3740
// ecdsa-with-SHA512 6850
// sha512WithRSAEncryption 16092

// command to get the pubkey as pem, can be used with publicKeyFromPem which works only for rsa:
// const pubkeyRes = await execAsync(`openssl x509 -pubkey -in outputs/certificates/certificate_${i}.pem`);
// if (pubkeyRes.stderr) {
//   throw new Error(pubkeyRes.stderr);
// }
// const pubkeyPEM = pubkeyRes.stdout

// Errors:
// Certificate 11445: Ukraine put sha256WithRSAEncryption instead of ecdsa something
// Certificate 11680: Ukraine put sha256WithRSAEncryption instead of ecdsa something
// Certificate 17767: Benin put ecdsa-with-SHA256 instead of rsa something
// Certificate 17765: Benin put ecdsa-with-SHA256 instead of rsa something