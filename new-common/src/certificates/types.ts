import type { Certificate } from 'pkijs';

import type { CertificateData } from '../foundation/types/certificate.js';

export interface ICertificateParser {
  parse(pem: string): CertificateData;
  getCertificateFromPem(pem: string): Certificate;
  getAuthorityKeyIdentifier(cert: Certificate): string;
}
