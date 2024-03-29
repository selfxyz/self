import * as fs from 'fs';
import * as util from 'util';
import { exec } from 'child_process';
const execAsync = util.promisify(exec);

// Count the number of files in certificates/
const numCertificates = fs.readdirSync('outputs/csca_certificates/').length;
const concurrencyLimit = 1; // Number of tasks to run at once

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
      tasks.push(extractModulus(i + j));
    }
    await Promise.all(tasks);
  }

  // console.log('publicKeysParsed 0', publicKeysParsed[0]);
  // const filteredPublicKeysParsed = publicKeysParsed.filter(item => item !== null);
  // fs.writeFileSync('public_keys_parsed.json', JSON.stringify(filteredPublicKeysParsed, null, 2));
  // console.log("public_keys_parsed.json written!")
}

async function extractModulus(i: number): Promise<void> {
  try {
    const certTextres = await execAsync(`openssl x509 -text -in outputs/certificates/certificate_${i}.pem`);
    const certText = certTextres.stdout as string;
    // const signatureAlgorithm = (certText.match(/Signature Algorithm: (.*)/) as RegExpExecArray)[1].trim();

    console.log('certText', certText)
    
    // const issuerRegex = /Issuer: ([^\n]+)/;
    // const issuer = extractData(issuerRegex, certText);

    // // console.log('issuer', issuer)

    // const pubkey = parsePubkey(certText, signatureAlgorithm);

    // if (!pubkey) {
    //   console.error(`Failed to extract data from certificate ${i}`);
    //   return;
    // }

    // publicKeysParsed[i] = {
    //   signatureAlgorithm,
    //   issuer,
    //   ...pubkey,
    // }
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