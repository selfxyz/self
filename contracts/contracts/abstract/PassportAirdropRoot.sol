// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {IVcAndDiscloseCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {IIdentityRegistryV1} from "../interfaces/IIdentityRegistryV1.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";
import {IPassportAirdropRoot} from "../interfaces/IPassportAirdropRoot.sol";

abstract contract PassportAirdropRoot is IPassportAirdropRoot {

    uint256 internal immutable _scope;
    uint256 internal immutable _attestationId;
    uint256 internal immutable _targetRootTimestamp;

    IPassportAirdropRoot.VerificationConfig internal _verificationConfig;

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
        address identityRegistry,
        uint256 scope, 
        uint256 attestationId,
        uint256 targetRootTimestamp,
        bool olderThanEnabled,
        uint256 olderThan,
        bool forbiddenCountriesEnabled,
        uint256 forbiddenCountriesListPacked,
        bool ofacEnabled
    ) {
        _identityVerificationHub = IIdentityVerificationHubV1(identityVerificationHub);
        _identityRegistry = IIdentityRegistryV1(identityRegistry);
        _scope = scope;
        _attestationId = attestationId;
        _targetRootTimestamp = targetRootTimestamp;
        _verificationConfig.olderThanEnabled = olderThanEnabled;
        _verificationConfig.olderThan = olderThan;
        _verificationConfig.forbiddenCountriesEnabled = forbiddenCountriesEnabled;
        _verificationConfig.forbiddenCountriesListPacked = forbiddenCountriesListPacked;
        _verificationConfig.ofacEnabled = ofacEnabled;
    }

    function _registerAddress(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    )
        internal
        returns (uint256 userIdentifier)
    {

        if (_scope != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]) {
            revert InvalidScope();
        }

        if (_nullifiers[proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX]] != 0) {
            revert RegisteredNullifier();
        }

        if(_attestationId != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]) {
            revert InvalidAttestationId();
        }

        IIdentityVerificationHubV1.VcAndDiscloseVerificationResult memory result = _identityVerificationHub.verifyVcAndDisclose(
            IIdentityVerificationHubV1.VcAndDiscloseHubProof({
                olderThanEnabled: _verificationConfig.olderThanEnabled,
                olderThan: _verificationConfig.olderThan,
                forbiddenCountriesEnabled: _verificationConfig.forbiddenCountriesEnabled,
                forbiddenCountriesListPacked: _verificationConfig.forbiddenCountriesListPacked,
                ofacEnabled: _verificationConfig.ofacEnabled,
                vcAndDiscloseProof: proof
            })
        );

        if (_targetRootTimestamp != 0) {
            if (_identityRegistry.rootTimestamps(result.identityCommitmentRoot) != _targetRootTimestamp) {
                revert InvalidTimestamp();
            }
        }

        _nullifiers[result.nullifier] = proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX];
        _registeredUserIdentifiers[proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]] = true;

        emit UserIdentifierRegistered(proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX], result.nullifier);

        return proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX];
    }
}
