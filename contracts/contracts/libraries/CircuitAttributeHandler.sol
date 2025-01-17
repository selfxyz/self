// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Formatter} from "./Formatter.sol";
import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";

library CircuitAttributeHandler {

    error INVALID_SIGNATURE_TYPE();

    function extractOlderThan(
        IIdentityVerificationHubV1.ProveCircuitProof memory proof
    ) internal pure returns (uint256) {
        if (proof.signatureType == IIdentityVerificationHubV1.SignatureType.RSA) {
            return Formatter.numAsciiToUint(proof.pubSignalsRSA[CircuitConstants.PROVE_RSA_OLDER_THAN_INDEX])*10
                + Formatter.numAsciiToUint(proof.pubSignalsRSA[CircuitConstants.PROVE_RSA_OLDER_THAN_INDEX + 1]);
        } else if (proof.signatureType == IIdentityVerificationHubV1.SignatureType.ECDSA) {
            return Formatter.numAsciiToUint(proof.pubSignalsECDSA[CircuitConstants.PROVE_ECDSA_OLDER_THAN_INDEX])*10
                + Formatter.numAsciiToUint(proof.pubSignalsECDSA[CircuitConstants.PROVE_ECDSA_OLDER_THAN_INDEX + 1]);
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }

    function extractOfacResult(
        IIdentityVerificationHubV1.ProveCircuitProof memory proof
    ) internal pure returns (bool) {
        if (proof.signatureType == IIdentityVerificationHubV1.SignatureType.RSA) {
            return (proof.pubSignalsRSA[CircuitConstants.PROVE_RSA_OFAC_RESULT_INDEX] != 0);
        } else if (proof.signatureType == IIdentityVerificationHubV1.SignatureType.ECDSA) {
            return (proof.pubSignalsECDSA[CircuitConstants.PROVE_ECDSA_OFAC_RESULT_INDEX] != 0);
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }

    function extractForbiddenCountries(
        IIdentityVerificationHubV1.ProveCircuitProof memory proof
    ) internal pure returns (bytes3[20] memory) {
        if (proof.signatureType == IIdentityVerificationHubV1.SignatureType.RSA) {
            return Formatter.extractForbiddenCountriesFromPacked(
                [
                    proof.pubSignalsRSA[CircuitConstants.PROVE_RSA_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX],
                    proof.pubSignalsRSA[CircuitConstants.PROVE_RSA_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX + 1]
                ]
            );
        } else if (proof.signatureType == IIdentityVerificationHubV1.SignatureType.ECDSA) {
            return Formatter.extractForbiddenCountriesFromPacked(
                [
                    proof.pubSignalsECDSA[CircuitConstants.PROVE_ECDSA_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX],
                    proof.pubSignalsECDSA[CircuitConstants.PROVE_ECDSA_FORBIDDEN_COUNTRIES_LIST_PACKED_DISCLOSED_INDEX + 1]
                ]
            );
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }

    function extractUserIdentifier(
        IIdentityVerificationHubV1.ProveCircuitProof memory proof
    ) internal pure returns (uint256) {
        if (proof.signatureType == IIdentityVerificationHubV1.SignatureType.RSA) {
            return proof.pubSignalsRSA[CircuitConstants.PROVE_RSA_USER_IDENTIFIER_INDEX];
        } else if (proof.signatureType == IIdentityVerificationHubV1.SignatureType.ECDSA) {
            return proof.pubSignalsECDSA[CircuitConstants.PROVE_ECDSA_USER_IDENTIFIER_INDEX];
        } else {
            revert INVALID_SIGNATURE_TYPE();
        }
    }


}