// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IOpenPassportVerifierRouterV1 {

    enum SignatureType {
        RSA,
        ECDSA
    }

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

    struct OpenPassportProof {
        uint256 proveVerifierId;
        uint256 dscVerifierId;
        ProveCircuitProof proveCircuitProof;
        DscCircuitProof dscCircuitProof;
    }

    function verify(
        OpenPassportProof memory proof
    ) external view returns (ProveCircuitProof memory);
}
