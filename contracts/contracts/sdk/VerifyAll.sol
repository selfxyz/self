// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {IIdentityRegistryV1} from "../interfaces/IIdentityRegistryV1.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";

contract VerifyAll is Ownable {

    IIdentityVerificationHubV1 _hub;
    IIdentityRegistryV1 _registry;

    constructor(
        address hub,
        address registry
    ) Ownable(msg.sender) {
        _hub = IIdentityVerificationHubV1(hub);
        _registry = IIdentityRegistryV1(registry);
    }

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
                ofac: 0
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
                    ofac: 0
                });
                return (emptyData, false);
            }
        }

        uint256[3] memory revealedDataPacked = result.revealedDataPacked;
        IIdentityVerificationHubV1.ReadableRevealedData memory readableData = _hub.getReadableRevealedData(revealedDataPacked, types);

        return (readableData, true);
    }

    function setHub(address hub) external onlyOwner {
        _hub = IIdentityVerificationHubV1(hub);
    }

    function setRegistry(address registry) external onlyOwner {
        _registry = IIdentityRegistryV1(registry);
    }

}