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
     * @notice Implementation of customVerificationHook for testing
     * @dev This function is called by onVerificationSuccess after hub address validation
     * @param output The verification output from the hub
     * @param userData The user data passed through verification
     */
    function customVerificationHook(
        bytes memory output,
        bytes memory userData
    ) internal override {
        verificationSuccessful = true;
        lastOutput = output;
        lastUserData = userData;

        emit VerificationCompleted(output, userData);
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

    /**
     * @notice Test function to simulate calling onVerificationSuccess from hub
     * @dev This function is only for testing purposes to verify access control
     * @param output The verification output
     * @param userData The user data
     */
    function testOnVerificationSuccess(
        bytes memory output,
        bytes memory userData
    ) external {
        // This should fail if called by anyone other than the hub
        onVerificationSuccess(output, userData);
    }
}
