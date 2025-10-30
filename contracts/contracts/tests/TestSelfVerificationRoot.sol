// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SelfVerificationRoot} from "../abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {SelfStructs} from "../libraries/SelfStructs.sol";
import {IPoseidonT3} from "../interfaces/IPoseidonT3.sol";

/**
 * @title TestSelfVerificationRoot
 * @notice Test implementation of SelfVerificationRoot for testing purposes
 * @dev This contract provides a concrete implementation of the abstract SelfVerificationRoot
 */
contract TestSelfVerificationRoot is SelfVerificationRoot {
    // Storage for testing purposes
    bool public verificationSuccessful;
    ISelfVerificationRoot.GenericDiscloseOutputV2 public lastOutput;
    bytes public lastUserData;
    SelfStructs.VerificationConfigV2 public verificationConfig;
    bytes32 public verificationConfigId;

    // Events for testing
    event VerificationCompleted(ISelfVerificationRoot.GenericDiscloseOutputV2 output, bytes userData);

    /**
     * @notice Constructor for the test contract
     * @param identityVerificationHubV2Address The address of the Identity Verification Hub V2
     * @param scopeSeed The scope seed string (unused, for signature compatibility)
     */
    constructor(
        address identityVerificationHubV2Address,
        string memory scopeSeed
    ) SelfVerificationRoot(identityVerificationHubV2Address, scopeSeed) {}

    /**
     * @notice Implementation of customVerificationHook for testing
     * @dev This function is called by onVerificationSuccess after hub address validation
     * @param output The verification output from the hub
     * @param userData The user data passed through verification
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal virtual override {
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
        lastOutput = ISelfVerificationRoot.GenericDiscloseOutputV2({
            attestationId: bytes32(0),
            userIdentifier: 0,
            nullifier: 0,
            forbiddenCountriesListPacked: [uint256(0), uint256(0), uint256(0), uint256(0)],
            issuingState: "",
            name: new string[](3),
            idNumber: "",
            nationality: "",
            dateOfBirth: "",
            gender: "",
            expiryDate: "",
            olderThan: 0,
            ofac: [false, false, false]
        });
        lastUserData = "";
    }

    function setVerificationConfig(SelfStructs.VerificationConfigV2 memory config) external {
        verificationConfig = config;
        verificationConfigId = _identityVerificationHubV2.setVerificationConfigV2(verificationConfig);
    }

    function setVerificationConfigNoHub(SelfStructs.VerificationConfigV2 memory config) external {
        verificationConfig = config;
        verificationConfigId = bytes32(uint256(1));
    }

    function setConfigId(bytes32 configId) external virtual {
        verificationConfigId = configId;
    }

    /**
     * @notice Override scope for testing with a specific PoseidonT3 address
     * @dev This function allows tests to recalculate scope using a deployed PoseidonT3 library
     * @param poseidonT3Address The address of the deployed PoseidonT3 library
     * @param scopeSeed The scope seed string to be hashed with contract address
     */
    function testGenerateScope(address poseidonT3Address, string memory scopeSeed) external {
        _scope = _calculateScope(address(this), scopeSeed, poseidonT3Address);
    }

    function getConfigId(
        bytes32 destinationChainId,
        bytes32 userIdentifier,
        bytes memory userDefinedData
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    /**
     * @notice Test function to simulate calling onVerificationSuccess from hub
     * @dev This function is only for testing purposes to verify access control
     * @param output The verification output
     * @param userData The user data
     */
    function testOnVerificationSuccess(bytes memory output, bytes memory userData) external {
        // This should fail if called by anyone other than the hub
        onVerificationSuccess(output, userData);
    }
}
