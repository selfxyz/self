// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";

abstract contract PassportAirdropRoot {

    uint256 internal immutable scope;
    uint256 internal immutable attestationId;

    IIdentityVerificationHubV1 internal immutable identityVerificationHub;

    mapping(uint256 => address) internal nullifiers;
    mapping(address => bool) internal registeredAddresses;

    error RegisteredNullifier();
    error InvalidAttestationId();
    error InvalidScope();

    event AddressRegistered(address indexed registeredAddress, uint256 indexed nullifier);

    constructor(address _identityVerificationHub, uint256 _scope, uint256 _attestationId) {
        identityVerificationHub = IIdentityVerificationHubV1(_identityVerificationHub);
        scope = _scope;
        attestationId = _attestationId;
    }

    function _registerAddress(
        address addressToRegister,
        IIdentityVerificationHubV1.VcAndDiscloseHubProof memory proof
    )
        internal
        returns (address registeredAddress)
    {

        if (scope != proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]) {
            revert InvalidScope();
        }

        if (nullifiers[proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX]] != address(0)) {
            revert RegisteredNullifier();
        }

        if(attestationId != proof.vcAndDiscloseProof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]) {
            revert InvalidAttestationId();
        }

        IIdentityVerificationHubV1.VcAndDiscloseVerificationResult memory result = identityVerificationHub.verifyVcAndDisclose(proof);

        nullifiers[result.nullifier] = addressToRegister;
        registeredAddresses[addressToRegister] = true;

        emit AddressRegistered(addressToRegister, result.nullifier);

        return addressToRegister;
    }
}
