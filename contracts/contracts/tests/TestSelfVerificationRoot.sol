// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SelfVerificationRoot} from "../abstract/SelfVerificationRoot.sol";

/**
 * @title TestSelfVerificationRoot
 * @notice Test implementation of SelfVerificationRoot for testing purposes
 * @dev This contract provides a concrete implementation of the abstract SelfVerificationRoot
 */
contract TestSelfVerificationRoot is SelfVerificationRoot {

    // Storage for testing purposes
    bool public verificationSuccessful;
    bytes public lastOutput;
    bytes public lastUserData;

    // Events for testing
    event VerificationCompleted(bytes output, bytes userData);

    /**
     * @notice Constructor for the test contract
     * @param identityVerificationHubV2Address The address of the Identity Verification Hub V2
     * @param scopeValue The expected proof scope for user registration
     */
    constructor(
        address identityVerificationHubV2Address,
        uint256 scopeValue
    ) SelfVerificationRoot(identityVerificationHubV2Address, scopeValue) {}

    /**
     * @notice Implementation of onVerificationSuccess for testing
     * @param verificationData The verification output from the hub
     * @param userDefinedData The user data passed through verification
     */
    function onVerificationSuccess(
        bytes memory verificationData,
        bytes memory userDefinedData
    ) public override {
        verificationSuccessful = true;
        lastOutput = verificationData;
        lastUserData = userDefinedData;

        emit VerificationCompleted(verificationData, userDefinedData);
    }

    /**
     * @notice Reset the test state
     */
    function resetTestState() external {
        verificationSuccessful = false;
        lastOutput = "";
        lastUserData = "";
    }

    /**
     * @notice Expose the internal _setScope function for testing
     * @param newScope The new scope value to set
     */
    function setScope(uint256 newScope) external {
        _setScope(newScope);
    }
}
