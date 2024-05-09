// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

//import {Groth16Verifier} from "./Verifier.sol";
import {IRegister} from "./interfaces/IRegister.sol";
import {Formatter} from "./Formatter.sol";
import {Registry} from "./Registry.sol";
import {Base64} from "./libraries/Base64.sol";
import {IVerifier} from "./IVerifier.sol";

import "@openzeppelin/contracts/utils/Strings.sol";
import "@zk-kit/imt.sol/internal/InternalLeanIMT.sol";

contract Register is IRegister {
    Formatter public immutable formatter;
    Registry public immutable registry;
    using Base64 for *;
    using Strings for uint256;

    //LeanIMT for commitments
    using InternalLeanIMT for LeanIMTData;
    LeanIMTData internal imt;
    mapping(uint256 => bool) public nullifiers;
    mapping(uint256 => bool) public merkleRootsCreated;

    mapping(uint256 => address) public verifiers;

    constructor(Formatter f, Registry r) {
        formatter = f;
        registry = r;
    }

    function validateProof(RegisterProof calldata proof) external override {
        
        if (!registry.checkRoot(bytes32(proof.merkle_root))) {
            revert Register__InvalidMerkleRoot();
        }
        if (nullifiers[proof.nullifier]) {
            revert Register__YouAreUsingTheSameNullifierTwice();
        }
        if (!verifyProof(proof)) {
            revert Register__InvalidProof();
        }

        nullifiers[proof.nullifier] = true;
        _addCommitment(proof.commitment);

        emit ProofValidated(
            proof.merkle_root,
            proof.nullifier,
            proof.commitment
        );
    }

    function verifyProof(RegisterProof calldata proof) public view override returns (bool) {
        return IVerifier(verifiers[proof.signature_algorithm]).verifyProof(
            proof.a,
            proof.b,
            proof.c,
            [uint(proof.commitment),uint(proof.nullifier),uint(proof.signature_algorithm), uint(proof.merkle_root)]
        );
    }

    function _addCommitment(uint256 commitment) internal {
        uint256 index = getMerkleTreeSize();
        uint256 imt_root = imt._insert(commitment);
        merkleRootsCreated[imt_root] = true;
        emit AddCommitment(index, commitment, imt_root);

    }

    function checkRoot(uint256 root) external view returns (bool) {
        return merkleRootsCreated[root];
    }

    function getMerkleTreeSize(
    ) public view returns (uint256) {
        return imt.size;
    }

    function indexOf(uint commitment) public view returns (uint256) {
        return imt._indexOf(commitment);
    }

    /*** DEV FUNCTIONS ***/
    function dev_add_commitment(uint256 commitment) external {
        _addCommitment(commitment);
    }

    function dev_set_signature_algorithm(uint256 signature_algorithm, address verifier_address) external {
        verifiers[signature_algorithm] = verifier_address;
    }

    
}

