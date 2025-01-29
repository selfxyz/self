// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {PassportAirdropRoot} from "../abstract/airdropRoot.sol";
import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {IVcAndDiscloseCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";

contract Airdrop is PassportAirdropRoot {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    bytes32 public merkleRoot;

    mapping(address => bool) public claimed;

    error InvalidProof();
    error AlreadyClaimed();
    error NotRegistered(address nonRegisteredAddress);
    error InvalidLength();

    event Claimed(uint256 index, address account, uint256 amount);

    constructor(
        address _identityVerificationHub, 
        uint256 _scope, 
        uint256 _attestationId,
        address _token
    ) 
        PassportAirdropRoot(_identityVerificationHub, _scope, _attestationId) 
    {
        token = IERC20(_token);
    }  

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function openRegistration() external onlyOwner {
        _openRegistration();
        emit RegistrationOpen();    
    }

    function closeRegistration() external onlyOwner {
        _closeRegistration();
    }

    function registeredAddress(
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    ) 
        external 
    {
        _registerAddress(msg.sender, proof);
    }

    function claim(
        uint256 index,
        uint256 amount,
        bytes32[] memory merkleProof
    ) external {
        if (claimed[msg.sender]) {
            revert AlreadyClaimed();
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
