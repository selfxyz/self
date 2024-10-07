//SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IVerifiersManager {

    error ZERO_ADDRESS();

    struct RSAProveCircuitProof {
        uint[2] a;
        uint[2][2] b;
        uint[2] c;
        uint[51] pubSignals;
    }

    struct DscCircuitProof {
        uint[2] a;
        uint[2][2] b;
        uint[2] c;
        uint[1] pubSignals;
    }

    function verifyWithProveVerifier(
        uint256 verifier_id,
        RSAProveCircuitProof memory proof
    ) external view returns (bool);

    function verifyWithDscVerifier(
        uint256 verifier_id,
        DscCircuitProof memory proof
    ) external view returns  (bool);

}

interface IProveVerifier {
    function verifyProof (
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[51] calldata _pubSignals
    ) external view returns (bool);
}

interface IDscVerifier {
    function verifyProof (
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[1] calldata _pubSignals
    ) external view returns (bool);
}