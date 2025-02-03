// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {PassportAirdropRoot} from "../abstract/PassportAirdropRoot.sol";
import {IPassportAirdropRoot} from "../interfaces/IPassportAirdropRoot.sol";
import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {IVcAndDiscloseCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Airdrop is PassportAirdropRoot, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    bytes32 public merkleRoot;

    mapping(address => bool) public claimed;
    bool public isRegistrationOpen;
    bool public isClaimOpen;

    error InvalidProof();
    error AlreadyClaimed();
    error NotRegistered(address nonRegisteredAddress);
    error RegistrationNotOpen();
    error RegistrationNotClosed();
    error ClaimNotOpen();

    event Claimed(uint256 index, address account, uint256 amount);
    event RegistrationOpen();
    event RegistrationClose();
    event ClaimOpen();
    event ClaimClose();

    constructor(
        address _identityVerificationHub, 
        address _identityRegistry,
        uint256 _scope, 
        uint256 _attestationId,
        address _token,
        uint256 _targetRootTimestamp,
        bool _olderThanEnabled,
        uint256 _olderThan,
        bool _forbiddenCountriesEnabled,
        uint256 _forbiddenCountriesListPacked,
        bool _ofacEnabled
    ) 
        PassportAirdropRoot(
            _identityVerificationHub, 
            _identityRegistry, 
            _scope, 
            _attestationId, 
            _targetRootTimestamp,
            _olderThanEnabled,
            _olderThan,
            _forbiddenCountriesEnabled,
            _forbiddenCountriesListPacked,
            _ofacEnabled
        )
        Ownable(_msgSender())
    {
        token = IERC20(_token);
    }  

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function setVerificationConfig(
        IPassportAirdropRoot.VerificationConfig memory newVerificationConfig
    )
        external
        onlyOwner
    {
        _verificationConfig = newVerificationConfig;
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

    function registerAddress(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    ) 
        external 
    {
        if (!isRegistrationOpen) {
            revert RegistrationNotOpen();
        }

        _registerAddress(proof);
    }

    function getScope() external view returns (uint256) {
        return _scope;
    }

    function getAttestationId() external view returns (uint256) {
        return _attestationId;
    }

    function getNullifier(uint256 nullifier) external view returns (uint256) {
        return _nullifiers[nullifier];
    }

    function getVerificationConfig() external view returns (IPassportAirdropRoot.VerificationConfig memory) {
        return _verificationConfig;
    }

    function isRegistered(address registeredAddress) external view returns (bool) {
        return _registeredUserIdentifiers[uint256(uint160(registeredAddress))];
    }

    function claim(
        uint256 index,
        uint256 amount,
        bytes32[] memory merkleProof
    ) external {
        if (isRegistrationOpen) {
            revert RegistrationNotClosed();
        }

        if (!isClaimOpen) {
            revert ClaimNotOpen();
        }

        if (claimed[msg.sender]) {
            revert AlreadyClaimed();
        }

        if (!_registeredUserIdentifiers[uint256(uint160(msg.sender))]) {
            revert NotRegistered(msg.sender);
        }

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, msg.sender, amount));
        if (!MerkleProof.verify(merkleProof, merkleRoot, node)) revert InvalidProof();

        // Mark it claimed and send the token.
        _setClaimed(index);
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Claimed(index, msg.sender, amount);
    }

    function _setClaimed(uint256 index) internal {
        claimed[msg.sender] = true;
    }

}
