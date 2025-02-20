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

    IIdentityVerificationHubV1 public hub;
    IIdentityRegistryV1 public registry;

    /// @notice Initializes the contract with hub and registry addresses
    /// @param hubAddress The address of the IdentityVerificationHub contract
    /// @param registryAddress The address of the IdentityRegistry contract
    constructor(
        address hubAddress,
        address registryAddress
    ) Ownable(msg.sender) {
        hub = IIdentityVerificationHubV1(hubAddress);
        registry = IIdentityRegistryV1(registryAddress);
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
            bool,
            string memory
        )
    {

        IIdentityVerificationHubV1.VcAndDiscloseVerificationResult memory result;
        try hub.verifyVcAndDisclose(proof) returns (IIdentityVerificationHubV1.VcAndDiscloseVerificationResult memory _result) {
            result = _result;
        } catch (bytes memory lowLevelData) {
            string memory errorCode;
            if (lowLevelData.length >= 4) {
                bytes4 errorSelector;
                assembly {
                    errorSelector := mload(add(lowLevelData, 32))
                }
                if (errorSelector == bytes4(keccak256("INVALID_COMMITMENT_ROOT()"))) {
                    errorCode = "INVALID_COMMITMENT_ROOT";
                } else if (errorSelector == bytes4(keccak256("CURRENT_DATE_NOT_IN_VALID_RANGE()"))) {
                    errorCode = "CURRENT_DATE_NOT_IN_VALID_RANGE";
                } else if (errorSelector == bytes4(keccak256("INVALID_OLDER_THAN()"))) {
                    errorCode = "INVALID_OLDER_THAN";
                } else if (errorSelector == bytes4(keccak256("INVALID_OFAC()"))) {
                    errorCode = "INVALID_OFAC";
                } else if (errorSelector == bytes4(keccak256("INVALID_OFAC_ROOT()"))) {
                    errorCode = "INVALID_OFAC_ROOT";
                } else if (errorSelector == bytes4(keccak256("INVALID_FORBIDDEN_COUNTRIES()"))) {
                    errorCode = "INVALID_FORBIDDEN_COUNTRIES";
                } else if (errorSelector == bytes4(keccak256("INVALID_VC_AND_DISCLOSE_PROOF()"))) {
                    errorCode = "INVALID_VC_AND_DISCLOSE_PROOF";
                }
            }
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
            return (emptyData, false, errorCode);
        }

        if (targetRootTimestamp != 0) {
            if (registry.rootTimestamps(result.identityCommitmentRoot) != targetRootTimestamp) {
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
                return (emptyData, false, "INVALID_TIMESTAMP");
            }
        }

        uint256[3] memory revealedDataPacked = result.revealedDataPacked;
        IIdentityVerificationHubV1.ReadableRevealedData memory readableData = hub.getReadableRevealedData(revealedDataPacked, types);

        return (readableData, true, "");
    }

    /// @notice Updates the hub contract address
    /// @param hubAddress The new hub contract address
    /// @dev Only callable by the contract owner
    function setHub(address hubAddress) external onlyOwner {
        hub = IIdentityVerificationHubV1(hubAddress);
    }

    /// @notice Updates the registry contract address
    /// @param registryAddress The new registry contract address
    /// @dev Only callable by the contract owner
    function setRegistry(address registryAddress) external onlyOwner {
        registry = IIdentityRegistryV1(registryAddress);
    }

}