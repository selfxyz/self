// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVcAndDiscloseCircuitVerifier {

    struct VcAndDiscloseProof {
        uint[2] pA;
        uint[2][2] pB;
        uint[2] pC;
        uint[20] pubSignals;
    }

    function verifyProof (
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[20] calldata pubSignals
    ) external view returns (bool);
}