// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {GenericProofStruct} from "../interfaces/IRegisterCircuitVerifier.sol";

/**
 * @title ProverSignatureLib
 * @notice Recovers the TEE prover key that signed a proof.
 * @dev Deliberately an EXTERNAL library, so its code is DELEGATECALL'd from a
 *      separately deployed address rather than inlined into the hub. An
 *      `internal` library would be inlined by the compiler and save the hub
 *      nothing -- the point of this extraction is the hub's EIP-170 budget, and
 *      only external linkage moves bytes out of it.
 *
 *      Recovery is `pure` and returns the signer instead of checking whether it
 *      is registered. Authorization stays in the hub, where the prover-key
 *      mapping lives: a library holding the check would need the storage
 *      pointer passed in, which both widens its contract and puts the decision
 *      one DELEGATECALL away from the state it decides on.
 */
library ProverSignatureLib {
    /**
     * @notice Recovers the address that signed a Groth16 proof.
     * @dev The digest mirrors the TEE prover byte-for-byte:
     *      keccak256(abi.encode(a, b, c, pubSignals)) with pubSignals as a
     *      dynamic array, signed raw-prehash -- no EIP-191 prefix, v in {27, 28}.
     *      `pubSignals` is dynamic for every caller, including the DSC path
     *      whose circuit takes a fixed uint256[2]; widening happens before this
     *      call so one digest definition serves every flow.
     * @param a Groth16 proof point A.
     * @param b Groth16 proof point B.
     * @param c Groth16 proof point C.
     * @param pubSignals Public signals, as a dynamic array.
     * @param signature 65-byte secp256k1 signature over the digest.
     * @return signer The recovered address, meaningless unless `ok` is true.
     * @return ok False when the signature is malformed, has a high s-value, or
     *         otherwise fails to recover -- callers must treat it as a rejection
     *         rather than comparing `signer` against anything.
     */
    function recoverProverSigner(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory pubSignals,
        bytes memory signature
    ) external pure returns (address signer, bool ok) {
        bytes32 digest = keccak256(abi.encode(a, b, c, pubSignals));
        ECDSA.RecoverError err;
        (signer, err, ) = ECDSA.tryRecover(digest, signature);
        ok = err == ECDSA.RecoverError.NoError;
    }

    /**
     * @notice Struct-taking form of `recoverProverSigner`.
     */
    function recoverProverSignerFromProof(
        GenericProofStruct memory proof,
        bytes memory signature
    ) external pure returns (address signer, bool ok) {
        bytes32 digest = keccak256(abi.encode(proof.a, proof.b, proof.c, proof.pubSignals));
        ECDSA.RecoverError err;
        (signer, err, ) = ECDSA.tryRecover(digest, signature);
        ok = err == ECDSA.RecoverError.NoError;
    }
}
