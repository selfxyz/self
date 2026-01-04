// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";

/**
 * @title TestMultichainDApp
 * @notice Test dApp for end-to-end multichain verification testing
 * @dev This contract demonstrates how dApps integrate with multichain verification
 */
contract TestMultichainDApp is ISelfVerificationRoot {
    event VerificationReceived(
        bytes output,
        bytes userData,
        uint256 timestamp
    );

    uint256 public constant SCOPE = 12345;
    uint256 public verificationCount;

    mapping(address => bool) public verifiedUsers;
    mapping(address => bytes) public lastVerificationOutput;

    function scope() external pure returns (uint256) {
        return SCOPE;
    }

    function verifySelfProof(
        bytes calldata /* proofPayload */,
        bytes calldata /* userContextData */
    ) external pure override {
        revert("TestMultichainDApp: use hub.verify() directly, not verifySelfProof()");
    }

    function onVerificationSuccess(
        bytes calldata output,
        bytes calldata userData
    ) external override {
        verificationCount++;
        lastVerificationOutput[tx.origin] = output;
        verifiedUsers[tx.origin] = true;
        emit VerificationReceived(output, userData, block.timestamp);
    }

    function getVerificationCount() external view returns (uint256) {
        return verificationCount;
    }

    function isUserVerified(address user) external view returns (bool) {
        return verifiedUsers[user];
    }

    function getUserOutput(address user) external view returns (bytes memory) {
        return lastVerificationOutput[user];
    }

    function reset() external {
        verificationCount = 0;
    }
}

/**
 * @title FailingDApp
 * @notice Test dApp that always reverts for error handling tests
 */
contract FailingDApp is ISelfVerificationRoot {
    function scope() external pure returns (uint256) {
        return 99999;
    }

    function verifySelfProof(
        bytes calldata /* proofPayload */,
        bytes calldata /* userContextData */
    ) external pure override {
        revert("FailingDApp: use hub.verify() directly, not verifySelfProof()");
    }

    function onVerificationSuccess(bytes calldata, bytes calldata) external pure override {
        revert("FailingDApp: intentional failure");
    }
}



