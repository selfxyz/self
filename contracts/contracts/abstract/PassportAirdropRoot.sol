// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {IIdentityRegistryV1} from "../interfaces/IIdentityRegistryV1.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";

abstract contract PassportAirdropRoot {

    uint256 internal immutable _scope;
    uint256 internal immutable _attestationId;
    uint256 internal immutable _targetRootTimestamp;

    IIdentityVerificationHubV1 internal immutable _identityVerificationHub;
    IIdentityRegistryV1 internal immutable _identityRegistry;

    mapping(uint256 => uint256) internal _nullifiers;
    mapping(uint256 => bool) internal _registeredUserIdentifiers;

    error RegisteredNullifier();
    error InvalidAttestationId();
    error InvalidScope();
    error InvalidTimestamp();

    event UserIdentifierRegistered(uint256 indexed registeredUserIdentifier, uint256 indexed nullifier);

    constructor(
        address identityVerificationHub, 
        address IdentityRegistry,
        uint256 scope, 
        uint256 attestationId,
        uint256 targetRootTimestamp
    ) {
        _identityVerificationHub = IIdentityVerificationHubV1(identityVerificationHub);
        _identityRegistry = IIdentityRegistryV1(IdentityRegistry);
        _scope = scope;
        _attestationId = attestationId;
        _targetRootTimestamp = targetRootTimestamp;
    }

    function _registerAddress(
        IIdentityVerificationHubV1.VcAndDiscloseHubProof memory proof
    )
        internal
        returns (uint256 userIdentifier)
    {

        if (_scope != proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]) {
            revert InvalidScope();
        }

        if (_nullifiers[proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX]] != 0) {
            revert RegisteredNullifier();
        }

        if(_attestationId != proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]) {
            revert InvalidAttestationId();
        }

        IIdentityVerificationHubV1.VcAndDiscloseVerificationResult memory result = _identityVerificationHub.verifyVcAndDisclose(proof);

        if (_targetRootTimestamp != 0) {
            if (_identityRegistry.rootTimestamps(result.identityCommitmentRoot) != _targetRootTimestamp) {
                revert InvalidTimestamp();
            }
        }

        _nullifiers[result.nullifier] = proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX];
        _registeredUserIdentifiers[proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]] = true;

        emit UserIdentifierRegistered(proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX], result.nullifier);

        return proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX];
    }
}
