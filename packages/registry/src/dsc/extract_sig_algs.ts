import * as fs from 'fs';
import * as util from 'util';
import { exec } from 'child_process';
const execAsync = util.promisify(exec);

const numCertificates = 19723; // 19723 // Replace with the number of certificates you have
const concurrencyLimit = 500;  // Number of tasks to run at once

const obj: {[key: string]: {[key: string]: number}} = {}

async function extractSigAlg(i: number): Promise<void> {
  try {
    const { stdout } = await execAsync(`openssl x509 -inform PEM -text -in outputs/certificates/certificate_${i}.pem`);
    const sigAlg = (stdout.match(/Signature Algorithm: (.*)/) as RegExpExecArray)[1];
    const issuer = (stdout.match(/Issuer: (.*)/) as RegExpExecArray)[1];
    if (obj[sigAlg]) {
      if (obj[sigAlg][issuer]) {
        obj[sigAlg][issuer] = obj[sigAlg][issuer] + 1
      } else {
        obj[sigAlg][issuer] = 1
      }
    } else {
      obj[sigAlg] = {}
      obj[sigAlg][issuer] = 1
    }
  } catch (error) {
    console.error(`Failed to extract data from certif ${i}: ${error}`);
  }
}

async function main() {
  for (let i = 0; i < numCertificates; i += concurrencyLimit) {
    const tasks: Promise<void>[] = [];
    for (let j = 0; j < concurrencyLimit && i + j < numCertificates; j++) {
      tasks.push(extractSigAlg(i + j));
    }
    await Promise.all(tasks);
  }
  console.log("Finished scanning");
  fs.writeFileSync("outputs/signature_algorithms.json", JSON.stringify(obj));
}

main()