// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {TestSelfVerificationRoot} from "./TestSelfVerificationRoot.sol";

/**
 * @title TestAirdrop
 * @notice Test version of Airdrop contract that inherits from TestSelfVerificationRoot
 * @dev This allows proper scope calculation for testing by using testGenerateScope
 */
contract TestAirdrop is TestSelfVerificationRoot, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    bytes32 public merkleRoot;
    mapping(address => bool) public claimed;
    bool public isRegistrationOpen;
    bool public isClaimOpen;
    mapping(uint256 nullifier => uint256 userIdentifier) internal _nullifierToUserIdentifier;
    mapping(uint256 userIdentifier => bool registered) internal _registeredUserIdentifiers;

    event Claimed(uint256 index, address account, uint256 amount);
    event RegistrationOpen();
    event RegistrationClose();
    event ClaimOpen();
    event ClaimClose();
    event UserIdentifierRegistered(uint256 indexed registeredUserIdentifier, uint256 indexed nullifier);
    event MerkleRootUpdated(bytes32 newMerkleRoot);

    error InvalidProof();
    error AlreadyClaimed();
    error NotRegistered(address nonRegisteredAddress);
    error RegistrationNotOpen();
    error RegistrationNotClosed();
    error ClaimNotOpen();
    error InvalidUserIdentifier();
    error UserIdentifierAlreadyRegistered();
    error RegisteredNullifier();

    constructor(
        address identityVerificationHubAddress,
        string memory scopeSeed,
        address tokenAddress
    ) TestSelfVerificationRoot(identityVerificationHubAddress, scopeSeed) Ownable(_msgSender()) {
        token = IERC20(tokenAddress);
    }

    function setMerkleRoot(bytes32 newMerkleRoot) external onlyOwner {
        merkleRoot = newMerkleRoot;
        emit MerkleRootUpdated(newMerkleRoot);
    }

    function openRegistration() external onlyOwner {
        isRegistrationOpen = true;
        emit RegistrationOpen();
    }

    function closeRegistration() external onlyOwner {
        isRegistrationOpen = false;
        emit RegistrationClose();
    }

    function openClaim() external onlyOwner {
        isClaimOpen = true;
        emit ClaimOpen();
    }

    function closeClaim() external onlyOwner {
        isClaimOpen = false;
        emit ClaimClose();
    }

    function isRegistered(address registeredAddress) external view returns (bool) {
        return _registeredUserIdentifiers[uint256(uint160(registeredAddress))];
    }

    function setConfigId(bytes32 configId) external override onlyOwner {
        verificationConfigId = configId;
    }

    function claim(uint256 index, uint256 amount, bytes32[] memory merkleProof) external {
        if (isRegistrationOpen) revert RegistrationNotClosed();
        if (!isClaimOpen) revert ClaimNotOpen();
        if (claimed[msg.sender]) revert AlreadyClaimed();
        if (!_registeredUserIdentifiers[uint256(uint160(msg.sender))]) revert NotRegistered(msg.sender);

        bytes32 node = keccak256(abi.encodePacked(index, msg.sender, amount));
        if (!MerkleProof.verify(merkleProof, merkleRoot, node)) revert InvalidProof();

        claimed[msg.sender] = true;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(index, msg.sender, amount);
    }

    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory /* userData */
    ) internal override {
        if (!isRegistrationOpen) revert RegistrationNotOpen();
        if (_nullifierToUserIdentifier[output.nullifier] != 0) revert RegisteredNullifier();
        if (output.userIdentifier == 0) revert InvalidUserIdentifier();
        if (_registeredUserIdentifiers[output.userIdentifier]) revert UserIdentifierAlreadyRegistered();

        _nullifierToUserIdentifier[output.nullifier] = output.userIdentifier;
        _registeredUserIdentifiers[output.userIdentifier] = true;

        emit UserIdentifierRegistered(output.userIdentifier, output.nullifier);

        // Call parent's customVerificationHook for any additional test functionality
        super.customVerificationHook(output, "");
    }
}
