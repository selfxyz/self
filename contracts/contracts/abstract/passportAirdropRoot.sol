// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {IIdentityRegistryV1} from "../interfaces/IIdentityRegistryV1.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";

abstract contract PassportAirdropRoot {

    uint256 internal immutable scope;
    uint256 internal immutable attestationId;
    uint256 internal immutable targetRootTimestamp;

    IIdentityVerificationHubV1 internal immutable identityVerificationHub;
    IIdentityRegistryV1 internal immutable identityRegistry;

    mapping(uint256 => uint256) internal nullifiers;
    mapping(uint256 => bool) internal registeredUserIdentifiers;

    error RegisteredNullifier();
    error InvalidAttestationId();
    error InvalidScope();
    error InvalidTimestamp();

    event UserIdentifierRegistered(uint256 indexed registeredUserIdentifier, uint256 indexed nullifier);

    constructor(
        address _identityVerificationHub, 
        address _IdentityRegistry,
        uint256 _scope, 
        uint256 _attestationId,
        uint256 _targetRootTimestamp
    ) {
        identityVerificationHub = IIdentityVerificationHubV1(_identityVerificationHub);
        identityRegistry = IIdentityRegistryV1(_IdentityRegistry);
        scope = _scope;
        attestationId = _attestationId;
        targetRootTimestamp = _targetRootTimestamp;
    }

    function _registerAddress(
        IIdentityVerificationHubV1.VcAndDiscloseHubProof memory proof
    )
        internal
        returns (uint256 userIdentifier)
    {

        if (scope != proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]) {
            revert InvalidScope();
        }

        if (nullifiers[proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX]] != 0) {
            revert RegisteredNullifier();
        }

        if(attestationId != proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]) {
            revert InvalidAttestationId();
        }

        IIdentityVerificationHubV1.VcAndDiscloseVerificationResult memory result = identityVerificationHub.verifyVcAndDisclose(proof);

        if (targetRootTimestamp != 0) {
            if (identityRegistry.rootTimestamps(result.identityCommitmentRoot) != targetRootTimestamp) {
                revert InvalidTimestamp();
            }
        }

        nullifiers[result.nullifier] = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX];
        registeredUserIdentifiers[proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]] = true;

        emit UserIdentifierRegistered(proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX], result.nullifier);

        return proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX];
    }
}
