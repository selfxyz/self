import type { Certificate } from 'pkijs';

import type { CertificateData } from '../foundation/types/certificate.js';
import { getCertificateFromPem, parseCertificateSimple } from './parsing/parseCertificateSimple.js';
import { getAuthorityKeyIdentifier } from './parsing/utils.js';
import type { ICertificateParser } from './types.js';

class SimpleCertificateParser implements ICertificateParser {
  parse(pem: string): CertificateData {
    return parseCertificateSimple(pem);
  }

  getCertificateFromPem(pem: string): Certificate {
    return getCertificateFromPem(pem);
  }

  getAuthorityKeyIdentifier(cert: Certificate): string {
    return getAuthorityKeyIdentifier(cert);
  }
}

export function createCertificateParser(): ICertificateParser {
  return new SimpleCertificateParser();
}
