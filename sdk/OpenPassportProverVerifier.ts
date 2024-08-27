import { groth16 } from 'snarkjs';
import { attributeToPosition, countryCodes, DEFAULT_RPC_URL, PASSPORT_ATTESTATION_ID } from './common/src/constants/constants';
import { checkMerkleRoot, getCurrentDateFormatted, parsePublicSignals, parsePublicSignalsProve, unpackReveal, verifyDSCValidity } from './utils';
import { OpenPassportVerifierReport } from './OpenPassportVerifierReport';
import { vkey_prove_rsa_65537_sha1, vkey_prove_rsa_65537_sha256, vkey_prove_rsapss_65537_sha256 } from './common/src/constants/vkey';
import forge from 'node-forge'
import { splitToWords } from '../common/src/utils/utils';
import { getSignatureAlgorithm } from '../common/src/utils/handleCertificate';


export class OpenPassportProverVerifier {
    scope: string;
    attestationId: string;
    requirements: string[][];
    rpcUrl: string;
    report: OpenPassportVerifierReport;

    constructor(options: { scope: string, attestationId?: string, requirements?: string[][], rpcUrl?: string }) {
        this.scope = options.scope;
        this.attestationId = options.attestationId || PASSPORT_ATTESTATION_ID;
        this.requirements = options.requirements || [];
        this.rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
        this.report = new OpenPassportVerifierReport();
    }

    getVkey(signatureAlgorithm: string, hashFunction: string) {
        switch (signatureAlgorithm + " " + hashFunction) {
            case "rsa sha256":
                return vkey_prove_rsa_65537_sha256;
            case "rsa sha1":
                return vkey_prove_rsa_65537_sha1;
            case "rsapss sha256":
                return vkey_prove_rsapss_65537_sha256;
            default:
                throw new Error("Invalid signature algorithm or hash function");
        }
    }

    async verify(openPassportProverInputs: OpenPassportProverInputs): Promise<OpenPassportVerifierReport> {
        const { signatureAlgorithm, hashFunction } = getSignatureAlgorithm(openPassportProverInputs.dsc);
        console.log("signatureAlgorithm", signatureAlgorithm);
        console.log("hashFunction", hashFunction);
        const vkey = this.getVkey(signatureAlgorithm, hashFunction);
        const parsedPublicSignals = parsePublicSignalsProve(openPassportProverInputs.publicSignals);
        //1. Verify the scope
        if (parsedPublicSignals.scope !== this.scope) {
            this.report.exposeAttribute('scope', parsedPublicSignals.scope, this.scope);
        }
        console.log('\x1b[32m%s\x1b[0m', `- scope verified`);

        //4. Verify the current_date
        if (parsedPublicSignals.current_date.toString() !== getCurrentDateFormatted().toString()) {
            this.report.exposeAttribute('current_date', parsedPublicSignals.current_date, getCurrentDateFormatted());
        }
        console.log('\x1b[32m%s\x1b[0m', `- current_date verified`);

        //5. Verify requirements
        const unpackedReveal = unpackReveal(parsedPublicSignals.revealedData_packed);
        for (const requirement of this.requirements) {
            const attribute = requirement[0];
            const value = requirement[1];
            const position = attributeToPosition[attribute];
            let attributeValue = '';
            for (let i = position[0]; i <= position[1]; i++) {
                attributeValue += unpackedReveal[i];
            }
            if (requirement[0] === "nationality" || requirement[0] === "issuing_state") {
                console.log("attributeValue", attributeValue);
                console.log("value", value);
                console.log("countryCodes[attributeValue]", countryCodes[attributeValue]);
                if (!countryCodes[attributeValue] || countryCodes[attributeValue] !== value) {
                    this.report.exposeAttribute(attribute as keyof OpenPassportVerifierReport);
                }
            }
            else {
                if (attributeValue !== value) {
                    this.report.exposeAttribute(attribute as keyof OpenPassportVerifierReport);
                }
            }
            console.log('\x1b[32m%s\x1b[0m', `- requirement ${requirement[0]} verified`);

        }

        //6. Verify the proof

        const verified_prove = await groth16.verify(
            vkey,
            openPassportProverInputs.publicSignals,
            openPassportProverInputs.proof as any
        )
        if (!verified_prove) {
            this.report.exposeAttribute('proof');
        }
        console.log('\x1b[32m%s\x1b[0m', `- proof verified`);

        this.report.nullifier = parsedPublicSignals.nullifier;
        this.report.user_identifier = parsedPublicSignals.user_identifier;



        //7 Verify the dsc
        const dscCertificate = forge.pki.certificateFromPem(openPassportProverInputs.dsc);
        const verified_certificate = verifyDSCValidity(dscCertificate, true);
        console.log("certificate verified:" + verified_certificate);


        // @ts-ignore
        const dsc_modulus = BigInt(dscCertificate.publicKey.n);
        const dsc_modulus_words = splitToWords(dsc_modulus, BigInt(64), BigInt(32));
        const modulus_from_proof = parsedPublicSignals.pubKey;

        const areArraysEqual = (arr1: string[], arr2: string[]) =>
            arr1.length === arr2.length &&
            arr1.every((value, index) => value === arr2[index]);

        const verified_modulus = areArraysEqual(dsc_modulus_words, modulus_from_proof);
        console.log("modulus verified:" + verified_modulus);

        return this.report;


    }
}

export class OpenPassportProverInputs {
    publicSignals: string[];
    proof: string[];
    dsc: string;

    constructor(publicSignals: string[], proof: string[], dsc: string) {
        this.publicSignals = publicSignals;
        this.proof = proof;
        this.dsc = dsc;
    }
}


