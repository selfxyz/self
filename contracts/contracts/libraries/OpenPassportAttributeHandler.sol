// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {OpenPassportFormatter} from "./OpenPassportFormatter.sol";
import {IOpenPassportVerifierV1} from "../interfaces/IOpenPassportVerifierV1.sol";
import {OpenPassportConstants} from "../constants/OpenPassportConstants.sol";

library OpenPassportAttributeHandler {

    error INVALID_SIGNATURE_TYPE();

    function extractOlderThan(
        IOpenPassportVerifierV1.ProveCircuitProof memory proof
    ) internal pure returns (uint256) {
        if (proof.signatureType == IOpenPassportVerifierV1.SignatureType.RSA) {
            return OpenPassportFormatter.numAsciiToUint(proof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_OLDER_THAN_INDEX])*10
                + OpenPassportFormatter.numAsciiToUint(proof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_OLDER_THAN_INDEX + 1]);
        } else if (proof.signatureType == IOpenPassportVerifierV1.SignatureType.ECDSA) {
            return OpenPassportFormatter.numAsciiToUint(proof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_OLDER_THAN_INDEX])*10
                + OpenPassportFormatter.numAsciiToUint(proof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_OLDER_THAN_INDEX + 1]);
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }

    function extractOfacResult(
        IOpenPassportVerifierV1.ProveCircuitProof memory proof
    ) internal pure returns (bool) {
        if (proof.signatureType == IOpenPassportVerifierV1.SignatureType.RSA) {
            return (proof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_OFAC_RESULT_INDEX] != 0);
        } else if (proof.signatureType == IOpenPassportVerifierV1.SignatureType.ECDSA) {
            return (proof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_OFAC_RESULT_INDEX] != 0);
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }

    function extractForbiddenCountries(
        IOpenPassportVerifierV1.ProveCircuitProof memory proof
    ) internal pure returns (bytes3[20] memory) {
        if (proof.signatureType == IOpenPassportVerifierV1.SignatureType.RSA) {
            return OpenPassportFormatter.extractForbiddenCountriesFromPacked(
                [
                    proof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX],
                    proof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX + 1]
                ]
            );
        } else if (proof.signatureType == IOpenPassportVerifierV1.SignatureType.ECDSA) {
            return OpenPassportFormatter.extractForbiddenCountriesFromPacked(
                [
                    proof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX],
                    proof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX + 1]
                ]
            );
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }

    function extractUserIdentifier(
        IOpenPassportVerifierV1.ProveCircuitProof memory proof
    ) internal pure returns (uint256) {
        if (proof.signatureType == IOpenPassportVerifierV1.SignatureType.RSA) {
            return proof.pubSignalsRSA[OpenPassportConstants.PROVE_RSA_USER_IDENTIFIER_INDEX];
        } else if (proof.signatureType == IOpenPassportVerifierV1.SignatureType.ECDSA) {
            return proof.pubSignalsECDSA[OpenPassportConstants.PROVE_ECDSA_USER_IDENTIFIER_INDEX];
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }


}