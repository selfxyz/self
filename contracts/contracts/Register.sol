// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import {IRegister} from "./interfaces/IRegister.sol";
import {Registry} from "./Registry.sol";
import {Base64} from "./libraries/Base64.sol";
import {IVerifier} from "./IVerifier.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@zk-kit/imt.sol/internal/InternalLeanIMT.sol";

/*** 
                                                                          ,--"""",--.__,---[],-------._                             
                                                                        ,"   __,'            \         \--""""""==;-                
                                                                      ," _,-"  "/---.___     \       ___\   ,-'',"                  
                                                                     /,-'      / ;. ,.--'-.__\  _,-"" ,| `,'   /                    
                                                                    /``""""-._/,-|:\       []\,' ```-/:;-. `. /                     
                                                                              `  ;:::      ||       /:,;  `-.\                      
                                                                                 =.,'__,---||-.____',.=                             
                                                                                 =(:\_     ||__    ):)=                             
                                                                                ,"::::`----||::`--':::"._                           
                                                                              ,':::::::::::||::::::::::::'.                         
                                                                     .__     ;:::.-.:::::__||___:::::.-.:::\     __,                
                                                                        """-;:::( O )::::>_|| _<::::( O )::::-"""                   
                                                                    =======;:::::`-`:::::::||':::::::`-`:::::\=======               
                                                                     ,--"";:::_____________||______________::::""----.          , , 
                                                                          ; ::`._(    |    |||     |   )_,'::::\_,,,,,,,,,,____/,'_,
                                                                        ,;    :::`--._|____[]|_____|_.-'::::::::::::::::::::::::);_ 
                                                                       ;/ /      :::::::::,||,:::::::::::::::::::::::::::::::::::/  
                                                                      /; ``''''----------/,'/,__,,,,,____:::::::::::::::::::::,"    
                                                                      ;/                :);/|_;| ,--.. . ```-.:::::::::::::_,"      
                                                                     /;                :::):__,'//""\\. ,--.. \:::,:::::_,"         
                                                                    ;/              :::::/ . . . . . . //""\\. \::":__,"            
                                                                    ;/          :::::::,' . . . . . . . . . . .:`::\                
   _      _      _      _      _      _      _      _      _      _ ';   _  :::::::__,'. ,--.._. .,--. . . ._. .:`::`               
 _( )_  _( )_  _( )_  _( )_  _( )_  _( )_  _( )_  _( )_  _( )_  _( )'; _(__,..--'''-._. //""\\.).//""\\_. ,--.. :`:::`              
(_ o _)(_ o _)(_ o _)(_ o _)(_ o _)(_ o _)(_ o _)(_ o _)(_ o _)(_ o ;)(_ / _\\_.//""\\ . .)._.o._.(. . .)//""\\.(:`::`)             
 (_,_)  (_,_)  (_,_)  (_,_)  (_,_)  (_,_)  (_,_)  (_,_)  (_,_)  (_,_;  (/,_)  (_._. .(.,.). ._._. .(.,.). ._._. .:`::`              
   _                                                                ;   (          . . . . . . . . . . . . . . . ;:::`              
 _( )_          ██╗ █████╗ ██████╗  █████╗ ███╗   ██╗    ███████╗██████╗;██╗████████╗██╗.██████╗.███╗ . ██╗ . . ;':::`              
(_ o _)         ██║██╔══██╗██╔══██╗██╔══██╗████╗  ██║    ██╔════╝██╔══██╗██║╚══██╔══╝██║██╔═══██╗████╗ .██║. . .;`:::_)             
 (_,_)          ██║███████║██████╔╝███████║██╔██╗ ██║    █████╗  ██║,:██║██║   ██║   ██║██║ . ██║██╔██╗ ██║ . . ;`::;`              
   _       ██   ██║██╔══██║██╔═══╝ ██╔══██║██║╚██╗██║    ██╔══╝  ██║ ,██║██║   ██║   ██║██║. .██║██║╚██╗██║. . ;':::;`              
 _( )_     ╚█████╔╝██║  ██║██║     ██║  ██║██║ ╚████║    ███████╗██████╔╝██║   ██║   ██║╚██████╔╝██║.╚████║ . ,':::;)_              
(_ o _)     ╚════╝ ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝    ╚══════╝╚═════╝ ╚═╝.  ╚═╝   ╚═╝ ╚═════╝ ╚═╝ .╚═══╝ .,':::;` _)             
 (_,_)                                                                  :    `.       . . . . . . . . . . . ;::::;`,_)              
   _      _      _      _      _      _      _      _      _      _      '.    `-.   . . . . ._. . . . . ,-'::::;  _                
 _( )_  _( )_  _( )_  _( )_  _( )_  _( )_  _( )_  _( )_  _( )_  _( )_  _( )`:__( )``--..___________..--'':::::;'`_( )_              
(_ o _)(_ o _)(_ o _)(_ o _)(_ o _)(_ o _)(_ o _)(_ o _)(_ o _)(_ o _)(_ o _)(`._::,.:,.:,:_ctr_:,:,.::,.:_;'`_)(_ o _)             
 (_,_)  (_,_)  (_,_)  (_,_)  (_,_)  (_,_)  (_,_)  (_,_)  (_,_)  (_,_)  (_,_)  (_,`"\/"\/\/'""""`\/"\/""\/"(_,_)  (_,_)                                                                                               `"\/"\/\/'""""`\/"\/""\/"                          
***/

contract Register is IRegister, Ownable {
    Registry public immutable registry;
    using Base64 for *;
    using Strings for uint256;

    using InternalLeanIMT for LeanIMTData;
    LeanIMTData internal imt;

    mapping(uint256 => bool) public nullifiers;
    mapping(uint256 => bool) public merkleRootsCreated;
    mapping(uint256 => address) public verifiers;

    constructor(Registry r) {
        registry = r;
        transferOwnership(msg.sender);
    }

    function validateProof(RegisterProof calldata proof) external override {
        if (!registry.checkRoot(bytes32(proof.merkle_root))) {
            revert Register__InvalidMerkleRoot();
        }
        if (nullifiers[proof.nullifier]) {
            revert Register__YouAreUsingTheSameNullifierTwice();
        }
        if (verifiers[proof.signature_algorithm] == address(0)) {
            revert Register__InvalidSignatureAlgorithm();
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

    function verifyProof(
        RegisterProof calldata proof
    ) public view override returns (bool) {
        return
            IVerifier(verifiers[proof.signature_algorithm]).verifyProof(
                proof.a,
                proof.b,
                proof.c,
                [
                    uint(proof.commitment),
                    uint(proof.nullifier),
                    uint(proof.merkle_root),
                    uint(proof.signature_algorithm)
                ]
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

    function getMerkleTreeSize() public view returns (uint256) {
        return imt.size;
    }

    function getMerkleRoot() public view returns (uint256) {
        return imt._root();
    }

    function indexOf(uint commitment) public view returns (uint256) {
        return imt._indexOf(commitment);
    }

    function addSignatureAlgorithm(
        uint256 signature_algorithm,
        address verifier_address
    ) external onlyOwner {
        require(
            verifier_address != address(0),
            "Register__InvalidVerifierAddress"
        );
        require(
            verifiers[signature_algorithm] == address(0),
            "Register__SignatureAlgorithmAlreadySet"
        );
        verifiers[signature_algorithm] = verifier_address;
    }

    /*** DEV FUNCTIONS ***/
    function dev_add_commitment(uint256 commitment) external {
        _addCommitment(commitment);
    }
}
