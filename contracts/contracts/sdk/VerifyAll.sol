// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {IIdentityRegistryV1} from "../interfaces/IIdentityRegistryV1.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";

/// @title VerifyAll
/// @notice A contract for verifying identity proofs and revealing selected data
/// @dev This contract interacts with IdentityVerificationHub and IdentityRegistry
contract VerifyAll is Ownable {

    IIdentityVerificationHubV1 _hub;
    IIdentityRegistryV1 _registry;

    /// @notice Initializes the contract with hub and registry addresses
    /// @param hub The address of the IdentityVerificationHub contract
    /// @param registry The address of the IdentityRegistry contract
    constructor(
        address hub,
        address registry
    ) Ownable(msg.sender) {
        _hub = IIdentityVerificationHubV1(hub);
        _registry = IIdentityRegistryV1(registry);
    }

    /// @notice Verifies identity proof and reveals selected data
    /// @param targetRootTimestamp The expected timestamp of the identity commitment root (0 to skip check)
    /// @param proof The VC and disclosure proof to verify
    /// @param types Array of data types to reveal
    /// @return readableData The revealed data in readable format
    /// @return success Whether the verification was successful
    function verifyAll (
        uint256 targetRootTimestamp,
        IIdentityVerificationHubV1.VcAndDiscloseHubProof memory proof,
        IIdentityVerificationHubV1.RevealedDataType[] memory types
    )
        external
        view
        returns (
            IIdentityVerificationHubV1.ReadableRevealedData memory,
            bool
        )
    {

        IIdentityVerificationHubV1.VcAndDiscloseVerificationResult memory result;
        try _hub.verifyVcAndDisclose(proof) returns (IIdentityVerificationHubV1.VcAndDiscloseVerificationResult memory _result) {
            result = _result;
        } catch {
            IIdentityVerificationHubV1.ReadableRevealedData memory emptyData = IIdentityVerificationHubV1.ReadableRevealedData({
                issuingState: "",
                name: new string[](0),
                passportNumber: "",
                nationality: "",
                dateOfBirth: "",
                gender: "",
                expiryDate: "",
                olderThan: 0,
                passportNoOfac: 1,
                nameAndDobOfac: 1,
                nameAndYobOfac: 1
            });
            return (emptyData, false);
        }

        if (targetRootTimestamp != 0) {
            if (_registry.rootTimestamps(result.identityCommitmentRoot) != targetRootTimestamp) {
                IIdentityVerificationHubV1.ReadableRevealedData memory emptyData = IIdentityVerificationHubV1.ReadableRevealedData({
                    issuingState: "",
                    name: new string[](0),
                    passportNumber: "",
                    nationality: "",
                    dateOfBirth: "",
                    gender: "",
                    expiryDate: "",
                    olderThan: 0,
                    passportNoOfac: 1,
                    nameAndDobOfac: 1,
                    nameAndYobOfac: 1
                });
                return (emptyData, false);
            }
        }

        uint256[3] memory revealedDataPacked = result.revealedDataPacked;
        IIdentityVerificationHubV1.ReadableRevealedData memory readableData = _hub.getReadableRevealedData(revealedDataPacked, types);

        return (readableData, true);
    }

    /// @notice Updates the hub contract address
    /// @param hub The new hub contract address
    /// @dev Only callable by the contract owner
    function setHub(address hub) external onlyOwner {
        _hub = IIdentityVerificationHubV1(hub);
    }

    /// @notice Updates the registry contract address
    /// @param registry The new registry contract address
    /// @dev Only callable by the contract owner
    function setRegistry(address registry) external onlyOwner {
        _registry = IIdentityRegistryV1(registry);
    }

}