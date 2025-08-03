import * as asn1js from 'asn1js';
import { sha256 } from 'js-sha256';
import type { Certificate } from 'pkijs';

export const getAuthorityKeyIdentifier = (cert: Certificate): string => {
  const authorityKeyIdentifierExt = cert.extensions.find((ext) => ext.extnID === '2.5.29.35');
  if (authorityKeyIdentifierExt) {
    const extnValueHex = authorityKeyIdentifierExt.extnValue.valueBlock.valueHexView;
    const asn1 = asn1js.fromBER(extnValueHex);
    if (asn1.offset !== -1) {
      const constructedValue = asn1.result.valueBlock as { value: Array<any> };
      if (constructedValue.value) {
        const keyIdentifierElement = constructedValue.value.find(
          (element) => element.idBlock.tagClass === 3 && element.idBlock.tagNumber === 0
        );
        if (keyIdentifierElement) {
          return Buffer.from(keyIdentifierElement.valueBlock.valueHexView).toString('hex');
        }
      }
    }
  } else {
    console.log('\x1b[31m%s\x1b[0m', 'no authority key identifier found');
  }
  return '';
};

export function getIssuerCountryCode(cert: Certificate): string {
  const issuerRDN = cert.issuer.typesAndValues;
  let issuerCountryCode = '';
  for (const rdn of issuerRDN) {
    if (rdn.type === '2.5.4.6') {
      // OID for Country Name
      issuerCountryCode = rdn.value.valueBlock.value;
      break;
    }
  }
  return issuerCountryCode.toUpperCase();
}

export const getSubjectKeyIdentifier = (cert: Certificate): string => {
  const subjectKeyIdentifier = cert.extensions.find((ext) => ext.extnID === '2.5.29.14');
  if (subjectKeyIdentifier) {
    let skiValue = Buffer.from(subjectKeyIdentifier.extnValue.valueBlock.valueHexView).toString(
      'hex'
    );

    skiValue = skiValue.replace(/^(?:30(?:16|1E|22|32|42))?(?:04(?:08|14|1C|20|30|40))?/, '');
    return skiValue;
  } else {
    // console.log('\x1b[31m%s\x1b[0m', 'no subject key identifier found'); // it's no big deal if this is not found
    // do a sha1 of the certificate tbs
    const hash = sha256.create();
    hash.update(cert.tbsView);
    return hash.hex();
  }
};
