//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IGenericVerifier {

    enum SignatureType {
        RSA,
        ECDSA
    } 

    enum VerificationType {
        Prove,
        Dsc
    }

    error ZERO_ADDRESS();
    error INVALID_SIGNATURE_TYPE();

    // TODO: Need to check if 28 public inputs are correct.
    struct ProveCircuitProof {
        SignatureType signatureType;
        uint[2] a;
        uint[2][2] b;
        uint[2] c;
        uint[51] pubSignalsRSA;
        uint[28] pubSignalsECDSA;
    }

    struct DscCircuitProof {
        uint[2] a;
        uint[2][2] b;
        uint[2] c;
        uint[2] pubSignals;
    }

    function verifyWithProveVerifier(
        uint256 verifierId,
        ProveCircuitProof memory proof
    ) external view returns (bool);

    function verifyWithDscVerifier(
        uint256 verifierId,
        DscCircuitProof memory proof
    ) external view returns  (bool);

}

interface IRSAProveVerifier {
    function verifyProof (
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[51] calldata _pubSignals
    ) external view returns (bool);
}

// TODO: Need to check if 28 public inputs are correct.
interface IECDSAProveVerifier {
    function verifyProof (
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[28] calldata _pubSignals
    ) external view returns (bool);
}

interface IDscVerifier {
    function verifyProof (
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[2] calldata _pubSignals
    ) external view returns (bool);
}