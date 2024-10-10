import { groth16 } from 'snarkjs';
import { n_dsc, k_dsc, ECDSA_K_LENGTH_FACTOR, k_dsc_ecdsa } from '../../common/src/constants/constants';
import {
    areArraysEqual,
    getVkeyFromArtifacts,
    verifyDSCValidity,
} from '../utils/utils';
import forge from 'node-forge';
import { splitToWords } from '../../common/src/utils/utils';
import { parseDSC } from '../../common/src/utils/certificates/handleCertificate';
import { OpenPassportAttestation, OpenPassportVerifierReport } from './index.web';
import { parsePublicSignalsProve } from '../../common/src/utils/openPassportAttestation';


export class AttestationVerifier {
    protected parsedPublicSignals: any;
    protected devMode: boolean;
    protected report: OpenPassportVerifierReport;

    constructor(devMode: boolean = false) {
        this.devMode = devMode;
    }

    async verify(attestation: OpenPassportAttestation): Promise<boolean> {
        const {
            proof: {
                value: { proof, publicSignals },
            },
            dsc: { value: dsc },
            dscProof: {
                value: { proof: dscProof, publicSignals: dscPublicSignals },
            },
        } = attestation;

        const { signatureAlgorithm, hashFunction } = parseDSC(dsc); // inacurracy in the case of register circuit

        const kScaled = signatureAlgorithm === 'ecdsa' ? ECDSA_K_LENGTH_FACTOR * k_dsc_ecdsa : k_dsc;
        const parsedPublicSignals = parsePublicSignalsProve(publicSignals, kScaled);

        await this.verifyProof(proof, publicSignals, dsc, 'prove');
        switch (this.circuit) {
            case 'prove':
                if (this.circuitMode === 'prove_offchain') {
                    await this.verifyProveArguments();
                    await this.verifyDsc(dsc);
                } else if (this.circuitMode === 'register') {
                    await this.verifyRegisterArguments();
                    await this.verifyDscProof(dscProof, dscPublicSignals, dsc);
                }
                break;
            case 'disclose':
                await this.verifyDiscloseArguments();
                break;
        }
        return this.report.valid;
    }

    protected async verifyProof(proof: string[], publicSignals: string[], dsc: string, circuit: string): Promise<void> {
        const vkey = this.getVerificationKey(dsc, circuit);
        const isVerified = await groth16.verify(vkey, publicSignals, proof as any);
        if (!isVerified) {
            // throw new Error('Proof verification failed');
        }
    }

    protected getVerificationKey(dsc: string, circuit: string) {
        const { signatureAlgorithm, hashFunction } = parseDSC(dsc);
        return getVkeyFromArtifacts(circuit, signatureAlgorithm, hashFunction);
    }

    protected async verifyDsc(dsc: string, pubKeyFromProof: string[]) {
        const dscCertificate = forge.pki.certificateFromPem(dsc);
        const isValidCertificate = verifyDSCValidity(dscCertificate, this.devMode);

        if (!isValidCertificate) {
            // throw new Error('Invalid certificate chain');
        }

        const dscModulus = BigInt((dscCertificate.publicKey as any).n);
        const dscModulusWords = splitToWords(dscModulus, n_dsc, k_dsc);
        const isModulusMatching = areArraysEqual(dscModulusWords, pubKeyFromProof);

        if (!isModulusMatching) {
            // throw new Error('Public key modulus does not match');
        }
    }

    private getParsedPublicSignals(publicSignals: string[], kScaled: number) {
        return parsePublicSignalsProve(publicSignals, kScaled);
    }

}
