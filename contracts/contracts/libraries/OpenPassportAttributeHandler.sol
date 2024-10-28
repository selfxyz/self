// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {OpenPassportFormatter} from "./OpenPassportFormatter.sol";
import {IGenericVerifier} from "../interfaces/IGenericVerifier.sol";
import {IOpenPassportVerifier} from "../interfaces/IOpenPassportVerifier.sol";
import {OpenPassportConstants} from "../constants/OpenPassportConstants.sol";

library OpenPassportAttributeHandler {

    error INVALID_SIGNATURE_TYPE();

    function extractOlderThan(
        IOpenPassportVerifier.OpenPassportAttestation memory attestation
    ) internal pure returns (uint256) {
        if (attestation.pProof.signatureType == IGenericVerifier.SignatureType.RSA) {
            return OpenPassportFormatter.numAsciiToUint(attestation.pProof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_OLDER_THAN_INDEX])*10
                + OpenPassportFormatter.numAsciiToUint(attestation.pProof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_OLDER_THAN_INDEX + 1]);
        } else if (attestation.pProof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
            return OpenPassportFormatter.numAsciiToUint(attestation.pProof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_OLDER_THAN_INDEX])*10
                + OpenPassportFormatter.numAsciiToUint(attestation.pProof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_OLDER_THAN_INDEX + 1]);
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }

    function extractOfacResult(
        IOpenPassportVerifier.OpenPassportAttestation memory attestation
    ) internal pure returns (bool) {
        if (attestation.pProof.signatureType == IGenericVerifier.SignatureType.RSA) {
            return (attestation.pProof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_OFAC_RESULT_INDEX] != 0);
        } else if (attestation.pProof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
            return (attestation.pProof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_OFAC_RESULT_INDEX] != 0);
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }

    function extractForbiddenCountries(
        IOpenPassportVerifier.OpenPassportAttestation memory attestation
    ) internal pure returns (bytes3[20] memory) {
        if (attestation.pProof.signatureType == IGenericVerifier.SignatureType.RSA) {
            return OpenPassportFormatter.extractForbiddenCountriesFromPacked(
                [
                    attestation.pProof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX],
                    attestation.pProof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX + 1]
                ]
            );
        } else if (attestation.pProof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
            return OpenPassportFormatter.extractForbiddenCountriesFromPacked(
                [
                    attestation.pProof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX],
                    attestation.pProof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX + 1]
                ]
            );
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }

    function extractUserIdentifier(
        IOpenPassportVerifier.OpenPassportAttestation memory attestation
    ) internal pure returns (uint256) {
        if (attestation.pProof.signatureType == IGenericVerifier.SignatureType.RSA) {
            return attestation.pProof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_USER_IDENTIFIER_INDEX];
        } else if (attestation.pProof.signatureType == IGenericVerifier.SignatureType.ECDSA) {
            return attestation.pProof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_USER_IDENTIFIER_INDEX];
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }


}