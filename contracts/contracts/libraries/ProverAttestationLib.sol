// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {GCPJWTHelper} from "./GCPJWTHelper.sol";
import {Formatter} from "./Formatter.sol";
import {IGCPJWTVerifier, IPCR0Manager} from "../registry/IdentityRegistryKycImplV1.sol";

/**
 * @title ProverAttestationLib
 * @notice Validates a GCP JWT attestation and returns the prover key it attests to.
 * @dev EXTERNAL, so its code is DELEGATECALL'd from a separately deployed
 *      address rather than inlined. An `internal` library would be inlined and
 *      save the hub nothing; moving bytes out of the hub's EIP-170 budget is
 *      the entire reason this exists.
 *
 *      Every check here is stateless: config values arrive as arguments and the
 *      attested address comes back as a return value, leaving the hub to write
 *      it. This is a cold path -- one call per enclave boot -- so the added
 *      DELEGATECALL is paid rarely, which is what makes it the right code to
 *      move out rather than anything on the disclose or register hot paths.
 *
 *      Errors are declared here because reverts originate here. The hub keeps
 *      its own declarations of the same names so they stay in its ABI: the
 *      selector is derived from the signature, not the declaring contract, so
 *      a caller matching on the hub's ABI still matches these reverts.
 */
library ProverAttestationLib {
    /// @notice Thrown when the prover verifier, PCR0 manager, or root CA hash is unset.
    error ProverConfigNotSet();
    /// @notice Thrown when the attestation proof fails verification.
    error InvalidProverProof();
    /// @notice Thrown when the attested root CA hash is not the configured one.
    error InvalidProverRootCA();
    /// @notice Thrown when the attested image hash is not registered in the PCR0 manager.
    error InvalidProverImage();
    /// @notice Thrown when the eat_nonce carries data beyond the two address chunks.
    error InvalidProverNoncePadding();
    /// @notice Thrown when the attested timestamp is more than an hour from block time.
    error InvalidProverTimestamp();
    /// @notice Thrown when the attested address decodes to the zero address.
    error InvalidProverAddress();

    /**
     * @notice Verifies a GCP JWT attestation proof and decodes the attested prover address.
     * @param gcpJwtVerifier The configured attestation proof verifier.
     * @param pcr0Manager The prover-only PCR0 manager holding permitted image digests.
     * @param gcpRootCAPubkeyHash The configured GCP root CA pubkey hash.
     * @param pA Groth16 proof element A.
     * @param pB Groth16 proof element B.
     * @param pC Groth16 proof element C.
     * @param pubSignals [rootCAHash, eatNonce[0-3], imageHash[0-2], currentDate[0-11]].
     * @return proverKey The attested address, guaranteed non-zero.
     */
    function validateAndDecode(
        address gcpJwtVerifier,
        address pcr0Manager,
        uint256 gcpRootCAPubkeyHash,
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[20] calldata pubSignals
    ) external view returns (address proverKey) {
        // An unset verifier must never be read as "skip verification".
        if (gcpJwtVerifier == address(0) || pcr0Manager == address(0) || gcpRootCAPubkeyHash == 0) {
            revert ProverConfigNotSet();
        }

        if (!IGCPJWTVerifier(gcpJwtVerifier).verifyProof(pA, pB, pC, pubSignals)) revert InvalidProverProof();

        if (pubSignals[0] != gcpRootCAPubkeyHash) revert InvalidProverRootCA();

        bytes memory imageHash = GCPJWTHelper.unpackAndConvertImageHash(pubSignals[5], pubSignals[6], pubSignals[7]);
        if (!IPCR0Manager(pcr0Manager).isPCR0Set(imageHash)) revert InvalidProverImage();

        // The circuit always emits 4 nonce chunks; a 40-char address fills only 2. The nonce's
        // declared length is a circuit input, not a public signal, so asserting the trailing
        // chunks are empty is the only on-chain bound on what else the nonce carried.
        if (pubSignals[3] != 0 || pubSignals[4] != 0) revert InvalidProverNoncePadding();

        uint256 currentTimestamp = Formatter.toTimeStampWithSeconds(
            2000 + pubSignals[8] * 10 + pubSignals[9],
            pubSignals[10] * 10 + pubSignals[11],
            pubSignals[12] * 10 + pubSignals[13],
            pubSignals[14] * 10 + pubSignals[15],
            pubSignals[16] * 10 + pubSignals[17],
            pubSignals[18] * 10 + pubSignals[19]
        );

        if (currentTimestamp + 1 hours < block.timestamp) revert InvalidProverTimestamp(); //1 hour in the past
        if (currentTimestamp > block.timestamp + 1 hours) revert InvalidProverTimestamp(); //1 hour in the future

        proverKey = GCPJWTHelper.unpackAndDecodeAddress(pubSignals[1], pubSignals[2]);
        if (proverKey == address(0)) revert InvalidProverAddress();
    }
}
