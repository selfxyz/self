//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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