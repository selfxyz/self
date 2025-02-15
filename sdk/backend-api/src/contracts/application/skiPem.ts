
import { SKI_PEM, SKI_PEM_DEV } from '../../../../../common/src/constants/skiPem';
export function getCSCAFromSKIApi(ski: string): Response {
    const normalizedSki = ski.replace(/\s+/g, '').toLowerCase();

    const cscaPemPROD = (SKI_PEM as any)[normalizedSki];
    const cscaPemDEV = (SKI_PEM_DEV as any)[normalizedSki];

    let cscaPem: string = cscaPemDEV || cscaPemPROD;

    if (!cscaPem) {
        const response: Response =
        {
            'found': false,
            'result': `CSCA not found, authorityKeyIdentifier: ${ski}`
        }
        return response;
    }

    if (!cscaPem.includes('-----BEGIN CERTIFICATE-----')) {
        cscaPem = `-----BEGIN CERTIFICATE-----\n${cscaPem}\n-----END CERTIFICATE-----`;
    }
    const response = {
        'found': true,
        'result': cscaPem
    }
    return response;
}

type Response = {
    'found': boolean,
    'result': string

}