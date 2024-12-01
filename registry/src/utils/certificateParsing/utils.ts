import { Certificate } from "pkijs";

export const getSubjectKeyIdentifier = (cert: Certificate): string => {
    const subjectKeyIdentifier = cert.extensions.find(
        (ext) => ext.extnID === '2.5.29.14'
    );
    if (subjectKeyIdentifier) {
        let skiValue = Buffer.from(subjectKeyIdentifier.extnValue.valueBlock.valueHexView).toString('hex');

        skiValue = skiValue.replace(/^(?:3016)?(?:0414)?/, '');
        return skiValue
    } else {
        // do a sha1 of the certificate tbs
        const crypto = require('crypto');
        const sha1 = crypto.createHash('sha1');
        sha1.update(cert.tbsView);
        return sha1.digest('hex');
    }
}

export function getIssuerCountryCode(cert: Certificate): string {
    const issuerRDN = cert.issuer.typesAndValues;
    let issuerCountryCode = '';
    for (const rdn of issuerRDN) {
        if (rdn.type === '2.5.4.6') { // OID for Country Name
            issuerCountryCode = rdn.value.valueBlock.value;
            break;
        }
    }
    return issuerCountryCode.toUpperCase();
}