import * as fs from 'fs';
import * as util from 'util';
import { exec } from 'child_process';
const execAsync = util.promisify(exec);

const numCertificates = fs.readdirSync('outputs/pem_unique_masters/').length;
const concurrencyLimit = 200;  // Number of tasks to run at once

const obj: { [key: string]: { [key: string]: number } } = {}

async function extractSigAlg(i: number): Promise<void> {
  try {
    const { stdout } = await execAsync(`openssl x509 -text -in outputs/pem_unique_masters/unique_cert_${i}.pem`);
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
  fs.writeFileSync("outputs/csca_signature_algorithms.json", JSON.stringify(obj));
}

main()