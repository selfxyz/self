// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {CircuitAttributeHandlerV2} from "./CircuitAttributeHandlerV2.sol";
import {AttestationId} from "../constants/AttestationId.sol";
import {SelfStructs} from "./SelfStructs.sol";
import {CircuitAttributeHandlerV2} from "./CircuitAttributeHandlerV2.sol";
import {Formatter} from "./Formatter.sol";
import {GenericFormatter} from "./GenericFormatter.sol";

library CustomVerifier {
    error InvalidAttestationId();
    error InvalidOfacCheck();
    error InvalidForbiddenCountries();
    error InvalidOlderThan();

    /**
     * @notice Verifies the configuration of the custom verifier.
     * @param attestationId The attestation ID.
     * @param config The verification config of the custom verifier.
     * @param proofOutput The proof output of the custom verifier.
     * @return genericDiscloseOutput The generic disclose output.
     */
    function customVerify(
        bytes32 attestationId,
        bytes calldata config,
        bytes calldata proofOutput
    ) external pure returns (SelfStructs.GenericDiscloseOutputV2 memory) {
        SelfStructs.VerificationConfigV2 memory verificationConfig = GenericFormatter.verificationConfigFromBytes(
            config
        );

        if (attestationId == AttestationId.E_PASSPORT) {
            SelfStructs.PassportOutput memory passportOutput = abi.decode(proofOutput, (SelfStructs.PassportOutput));
            return CustomVerifier.verifyPassport(verificationConfig, passportOutput);
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            SelfStructs.EuIdOutput memory idCardOutput = abi.decode(proofOutput, (SelfStructs.EuIdOutput));
            return CustomVerifier.verifyIdCard(verificationConfig, idCardOutput);
        } else {
            revert InvalidAttestationId();
        }
    }

    /**
     * @notice Verifies a passport output.
     * @param verificationConfig The verification configuration.
     * @param passportOutput The passport output from the circuit.
     * @return genericDiscloseOutput The generic disclose output.
     */
    function verifyPassport(
        SelfStructs.VerificationConfigV2 memory verificationConfig,
        SelfStructs.PassportOutput memory passportOutput
    ) internal pure returns (SelfStructs.GenericDiscloseOutputV2 memory) {
        if (
            verificationConfig.ofacEnabled[0] || verificationConfig.ofacEnabled[1] || verificationConfig.ofacEnabled[2]
        ) {
            if (
                !CircuitAttributeHandlerV2.compareOfac(
                    AttestationId.E_PASSPORT,
                    passportOutput.revealedDataPacked,
                    verificationConfig.ofacEnabled[0],
                    verificationConfig.ofacEnabled[1],
                    verificationConfig.ofacEnabled[2]
                )
            ) {
                revert InvalidOfacCheck();
            }
        }
        if (verificationConfig.forbiddenCountriesEnabled) {
            for (uint256 i = 0; i < 4; i++) {
                if (
                    passportOutput.forbiddenCountriesListPacked[i] != verificationConfig.forbiddenCountriesListPacked[i]
                ) {
                    revert InvalidForbiddenCountries();
                }
            }
        }

        if (verificationConfig.olderThanEnabled) {
            if (
                !CircuitAttributeHandlerV2.compareOlderThan(
                    AttestationId.E_PASSPORT,
                    passportOutput.revealedDataPacked,
                    verificationConfig.olderThan
                )
            ) {
                revert InvalidOlderThan();
            }
        }

        SelfStructs.GenericDiscloseOutputV2 memory genericDiscloseOutput = SelfStructs.GenericDiscloseOutputV2({
            attestationId: AttestationId.E_PASSPORT,
            userIdentifier: passportOutput.userIdentifier,
            nullifier: passportOutput.nullifier,
            forbiddenCountriesListPacked: passportOutput.forbiddenCountriesListPacked,
            issuingState: CircuitAttributeHandlerV2.getIssuingState(
                AttestationId.E_PASSPORT,
                passportOutput.revealedDataPacked
            ),
            name: CircuitAttributeHandlerV2.getName(AttestationId.E_PASSPORT, passportOutput.revealedDataPacked),
            idNumber: CircuitAttributeHandlerV2.getDocumentNumber(
                AttestationId.E_PASSPORT,
                passportOutput.revealedDataPacked
            ),
            nationality: CircuitAttributeHandlerV2.getNationality(
                AttestationId.E_PASSPORT,
                passportOutput.revealedDataPacked
            ),
            dateOfBirth: CircuitAttributeHandlerV2.getDateOfBirth(
                AttestationId.E_PASSPORT,
                passportOutput.revealedDataPacked
            ),
            gender: CircuitAttributeHandlerV2.getGender(AttestationId.E_PASSPORT, passportOutput.revealedDataPacked),
            expiryDate: CircuitAttributeHandlerV2.getExpiryDate(
                AttestationId.E_PASSPORT,
                passportOutput.revealedDataPacked
            ),
            olderThan: verificationConfig.olderThan,
            ofac: [
                CircuitAttributeHandlerV2.getDocumentNoOfac(
                    AttestationId.E_PASSPORT,
                    passportOutput.revealedDataPacked
                ),
                CircuitAttributeHandlerV2.getNameAndDobOfac(
                    AttestationId.E_PASSPORT,
                    passportOutput.revealedDataPacked
                ),
                CircuitAttributeHandlerV2.getNameAndYobOfac(AttestationId.E_PASSPORT, passportOutput.revealedDataPacked)
            ]
        });

        return genericDiscloseOutput;
    }

    /**
     * @notice Verifies an ID card output.
     * @param verificationConfig The verification configuration.
     * @param idCardOutput The ID card output from the circuit.
     * @return genericDiscloseOutput The generic disclose output.
     */
    function verifyIdCard(
        SelfStructs.VerificationConfigV2 memory verificationConfig,
        SelfStructs.EuIdOutput memory idCardOutput
    ) internal pure returns (SelfStructs.GenericDiscloseOutputV2 memory) {
        if (verificationConfig.ofacEnabled[0] || verificationConfig.ofacEnabled[1]) {
            if (
                !CircuitAttributeHandlerV2.compareOfac(
                    AttestationId.EU_ID_CARD,
                    idCardOutput.revealedDataPacked,
                    false,
                    verificationConfig.ofacEnabled[0],
                    verificationConfig.ofacEnabled[1]
                )
            ) {
                revert InvalidOfacCheck();
            }
        }

        if (verificationConfig.forbiddenCountriesEnabled) {
            for (uint256 i = 0; i < 4; i++) {
                if (
                    idCardOutput.forbiddenCountriesListPacked[i] != verificationConfig.forbiddenCountriesListPacked[i]
                ) {
                    revert InvalidForbiddenCountries();
                }
            }
        }

        if (verificationConfig.olderThanEnabled) {
            if (
                !CircuitAttributeHandlerV2.compareOlderThan(
                    AttestationId.EU_ID_CARD,
                    idCardOutput.revealedDataPacked,
                    verificationConfig.olderThan
                )
            ) {
                revert InvalidOlderThan();
            }
        }

        SelfStructs.GenericDiscloseOutputV2 memory genericDiscloseOutput = SelfStructs.GenericDiscloseOutputV2({
            attestationId: AttestationId.EU_ID_CARD,
            userIdentifier: idCardOutput.userIdentifier,
            nullifier: idCardOutput.nullifier,
            forbiddenCountriesListPacked: idCardOutput.forbiddenCountriesListPacked,
            issuingState: CircuitAttributeHandlerV2.getIssuingState(
                AttestationId.EU_ID_CARD,
                idCardOutput.revealedDataPacked
            ),
            name: CircuitAttributeHandlerV2.getName(AttestationId.EU_ID_CARD, idCardOutput.revealedDataPacked),
            idNumber: CircuitAttributeHandlerV2.getDocumentNumber(
                AttestationId.EU_ID_CARD,
                idCardOutput.revealedDataPacked
            ),
            nationality: CircuitAttributeHandlerV2.getNationality(
                AttestationId.EU_ID_CARD,
                idCardOutput.revealedDataPacked
            ),
            dateOfBirth: CircuitAttributeHandlerV2.getDateOfBirth(
                AttestationId.EU_ID_CARD,
                idCardOutput.revealedDataPacked
            ),
            gender: CircuitAttributeHandlerV2.getGender(AttestationId.EU_ID_CARD, idCardOutput.revealedDataPacked),
            expiryDate: CircuitAttributeHandlerV2.getExpiryDate(
                AttestationId.EU_ID_CARD,
                idCardOutput.revealedDataPacked
            ),
            olderThan: verificationConfig.olderThan,
            ofac: [
                false,
                CircuitAttributeHandlerV2.getNameAndDobOfac(AttestationId.EU_ID_CARD, idCardOutput.revealedDataPacked),
                CircuitAttributeHandlerV2.getNameAndYobOfac(AttestationId.EU_ID_CARD, idCardOutput.revealedDataPacked)
            ]
        });

        return genericDiscloseOutput;
    }
}
