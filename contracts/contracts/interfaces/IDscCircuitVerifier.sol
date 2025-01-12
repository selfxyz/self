//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IDscCircuitVerifier {

    struct DscCircuitProof {
        uint[2] a;
        uint[2][2] b;
        uint[2] c;
        uint[2] pubSignals;
    }

    function verifyProof (
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[2] calldata _pubSignals
    ) external view returns (bool);
}