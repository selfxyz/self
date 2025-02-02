// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {IVcAndDiscloseCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {IIdentityRegistryV1} from "../interfaces/IIdentityRegistryV1.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";

abstract contract PassportAirdropRoot {

    uint256 internal immutable scope;
    uint256 internal immutable attestationId;
    uint256 internal immutable targetRootTimestamp;

    bool internal immutable olderThanEnabled;
    uint256 internal immutable olderThan;
    bool internal immutable forbiddenCountriesEnabled;
    uint256 internal immutable forbiddenCountriesListPacked;
    bool internal immutable ofacEnabled;

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
        uint256 _targetRootTimestamp,
        bool _olderThanEnabled,
        uint256 _olderThan,
        bool _forbiddenCountriesEnabled,
        uint256 _forbiddenCountriesListPacked,
        bool _ofacEnabled
    ) {
        identityVerificationHub = IIdentityVerificationHubV1(_identityVerificationHub);
        identityRegistry = IIdentityRegistryV1(_IdentityRegistry);
        scope = _scope;
        attestationId = _attestationId;
        targetRootTimestamp = _targetRootTimestamp;
        olderThanEnabled = _olderThanEnabled;
        olderThan = _olderThan;
        forbiddenCountriesEnabled =  _forbiddenCountriesEnabled;
        forbiddenCountriesListPacked =  _forbiddenCountriesListPacked;
        ofacEnabled = _ofacEnabled;
    }

    function _registerAddress(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    )
        internal
        returns (uint256 userIdentifier)
    {

        if (scope != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]) {
            revert InvalidScope();
        }

        if (nullifiers[proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX]] != 0) {
            revert RegisteredNullifier();
        }

        if(attestationId != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]) {
            revert InvalidAttestationId();
        }

        IIdentityVerificationHubV1.VcAndDiscloseVerificationResult memory result = identityVerificationHub.verifyVcAndDisclose(
            IIdentityVerificationHubV1.VcAndDiscloseHubProof({
                olderThanEnabled: olderThanEnabled,
                olderThan: olderThan,
                forbiddenCountriesEnabled: forbiddenCountriesEnabled,
                forbiddenCountriesListPacked: forbiddenCountriesListPacked,
                ofacEnabled: ofacEnabled,
                vcAndDiscloseProof: proof
            })
        );

        if (targetRootTimestamp != 0) {
            if (identityRegistry.rootTimestamps(result.identityCommitmentRoot) != targetRootTimestamp) {
                revert InvalidTimestamp();
            }
        }

        nullifiers[result.nullifier] = proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX];
        registeredUserIdentifiers[proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]] = true;

        emit UserIdentifierRegistered(proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX], result.nullifier);

        return proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX];
    }
}
