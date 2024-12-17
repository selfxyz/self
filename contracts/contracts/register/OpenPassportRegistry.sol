// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OpenPassportRegistry is Ownable {
    bytes32 public merkleRoot;

    constructor(bytes32 _merkleRoot) Ownable(msg.sender) {
        merkleRoot = _merkleRoot;
        transferOwnership(msg.sender);
    }

    function update(bytes32 _merkleRoot) public onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function checkRoot(bytes32 _merkleRoot) public view returns (bool) {
        return merkleRoot == _merkleRoot;
    }

    function getMerkleRoot() public view returns (bytes32) {
        return merkleRoot;
    }
}