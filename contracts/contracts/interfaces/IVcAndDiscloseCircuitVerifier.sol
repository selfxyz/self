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
        VcAndDiscloseProof memory proof
    ) external view returns (bool);
}