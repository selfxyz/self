// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {IVcAndDiscloseCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";

abstract contract PassportAirdropRoot is Ownable {

    uint256 internal immutable scope;
    uint256 internal immutable attestationId;

    IIdentityVerificationHubV1 internal immutable identityVerificationHub;

    mapping(uint256 => address) internal nullifiers;
    mapping(address => bool) internal registeredAddresses;

    bool internal registrationOpen;

    error RegistrationNotOpen();
    error AlreadyRegistered();
    error RegisteredNullifier();
    error InvalidAttestationId();
    error InvalidScope();

    event RegistrationOpen();
    event RegistrationClose();
    event AddressRegistered(address indexed registeredAddress, uint256 indexed nullifier);

    constructor(address _identityVerificationHub, uint256 _scope, uint256 _attestationId) Ownable(msg.sender) {
        identityVerificationHub = IIdentityVerificationHubV1(_identityVerificationHub);
        scope = _scope;
        attestationId = _attestationId;
    }

    function _registerAddress(
        address addressToRegister,
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    )
        internal
        returns (address registeredAddress)
    {
        if (!registrationOpen) {
            revert RegistrationNotOpen();
        }

        if (scope != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]) {
            revert InvalidScope();
        }

        if (nullifiers[proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX]] != address(0)) {
            revert AlreadyRegistered();
        }

        if(attestationId != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]) {
            revert InvalidAttestationId();
        }

        IIdentityVerificationHubV1.VcAndDiscloseVerificationResult memory result = identityVerificationHub.verifyVcAndDisclose(proof);

        nullifiers[result.nullifier] = addressToRegister;
        registeredAddresses[addressToRegister] = true;

        emit AddressRegistered(addressToRegister, result.nullifier);

        return addressToRegister;
    }

    function _openRegistration() internal onlyOwner {
        registrationOpen = true;
        emit RegistrationOpen();
    }

    function _closeRegistration() internal onlyOwner {
        registrationOpen = false;
        emit RegistrationClose();
    }
}
