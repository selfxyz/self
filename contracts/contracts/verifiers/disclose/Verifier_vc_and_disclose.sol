// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Verifier_vc_and_disclose {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 16428432848801857252194528405604668803277877773566238944394625302971855135431;
    uint256 constant alphay  = 16846502678714586896801519656441059708016666274385668027902869494772365009666;
    uint256 constant betax1  = 3182164110458002340215786955198810119980427837186618912744689678939861918171;
    uint256 constant betax2  = 16348171800823588416173124589066524623406261996681292662100840445103873053252;
    uint256 constant betay1  = 4920802715848186258981584729175884379674325733638798907835771393452862684714;
    uint256 constant betay2  = 19687132236965066906216944365591810874384658708175106803089633851114028275753;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 4208242267248789053828092105678707152810727302421704805417689166806500057546;
    uint256 constant deltax2 = 5271221976433221763304741528380840580903119658570165237480182570804501659558;
    uint256 constant deltay1 = 11327385974519668968032322736085307141713806429709421661182708424466117238997;
    uint256 constant deltay2 = 10012305292867396754099447814288164358641801402945324446509796861150789568449;

    
    uint256 constant IC0x = 5645809423132108234526155064520926563161700247800213537205723921444703247217;
    uint256 constant IC0y = 19273662370473753554670561090991166814029325379251212873103161241607581584566;
    
    uint256 constant IC1x = 1797669655256453130371220220781770764170539267531220862021381942885591828064;
    uint256 constant IC1y = 7001586812758904198735882543207168343594801214486108350714954778228545102578;
    
    uint256 constant IC2x = 16151498656936517849109903512557528108224465357388552905088955276567940069352;
    uint256 constant IC2y = 21290383973737261995392203381388245229530591066391887542266051339172122980610;
    
    uint256 constant IC3x = 13594306613618663328469180492848909213054943576045786330757072453957461211429;
    uint256 constant IC3y = 17106191422608317011071228510210313119098258902423951406450677354622457559954;
    
    uint256 constant IC4x = 10540562137042439306820327362182488961461252811713311037793556389563213988367;
    uint256 constant IC4y = 13390475227407915257414653696902926958379562466610252657969000491800379839832;
    
    uint256 constant IC5x = 14047770242565207987849727178067237797960577221760083987091292937338321362192;
    uint256 constant IC5y = 4607949095956681151208754684340954434065140599773002127904735754740923457290;
    
    uint256 constant IC6x = 533605635141604091468837890450980097899976907187175033882725759869648895139;
    uint256 constant IC6y = 5121343922882143859016572020277997629769211588320816684559275427523086391260;
    
    uint256 constant IC7x = 20950810023595074636645188401126777396931698429970632510329364260508114254649;
    uint256 constant IC7y = 15363004416976419598006096303962722739509622870059250392680729963552585027821;
    
    uint256 constant IC8x = 21141369375300299590026264437282327654307650673045833038665014396619386405360;
    uint256 constant IC8y = 13568060724977289928853639950012597657294256347073414147013319159524409681097;
    
    uint256 constant IC9x = 12070388761580959399164669209709461362321643934983690375125147552128464963953;
    uint256 constant IC9y = 13122752493285998578654222539640165097582774244857666169217998263040175338511;
    
    uint256 constant IC10x = 3155043394395334396684505740101602478801121319174204325455833353483450426603;
    uint256 constant IC10y = 4001903316495741471727515697485538626849994288595198286197670853000376952608;
    
    uint256 constant IC11x = 11580817845413390940484294910470637940735781669534450285058891649231298055438;
    uint256 constant IC11y = 11745932694467884175811632165252866594271326601859010100723177984958589451650;
    
    uint256 constant IC12x = 2881070016945796223001080172114503185514285867729144217331063554991484954126;
    uint256 constant IC12y = 14167304337176286668786874852785788018624401891816801704956527547500195848883;
    
    uint256 constant IC13x = 18883405056778717265600091502443498671078474036444505009504491224347768060512;
    uint256 constant IC13y = 14812978301212555409657902542346841425786957827465950093762300162318026670295;
    
    uint256 constant IC14x = 6577157458950343654298030929658788314638268827611749219037795310784295524862;
    uint256 constant IC14y = 8429244719525290744211189219610479430815666050697340325468837559505312383856;
    
    uint256 constant IC15x = 16374040167465027877148927308323868423523506482577951143585975183285308096400;
    uint256 constant IC15y = 19848062855727074979497070827222518475377208981773894131613945308293152037386;
    
    uint256 constant IC16x = 5369066939278676378968646518060321291123419641615507226693819438606229259727;
    uint256 constant IC16y = 16729550092204417517172374565729920596490405185877796985933449527255634235308;
    
    uint256 constant IC17x = 14649963317278229594447647740414141466603479012579221101904384047636220514768;
    uint256 constant IC17y = 14247491789479084970737272226075028063019925997471420682570205007884944759477;
    
    uint256 constant IC18x = 11902572680644837317532839083230381253517912078611490650871537384207738042092;
    uint256 constant IC18y = 20016771317149607035640286896673339585314902815531231665552693497445627584165;
    
    uint256 constant IC19x = 13662298766996950339241997202544532479906071787308616133742838930447382591478;
    uint256 constant IC19y = 20739438792451670425639845258461859578645504245239453508387345820702014104428;
    
    uint256 constant IC20x = 11743378744218879600087835709388165328591499404152675849147563493614332998904;
    uint256 constant IC20y = 4541034768018638352186080395830990298417361588467317129716290912950603785160;
    
    uint256 constant IC21x = 11482551398584236834849590479781862497389279604940066814152820783286286153167;
    uint256 constant IC21y = 12585642819692696296358219602072676911890723261269077558436703827603489236308;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[21] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                
                g1_mulAccC(_pVk, IC17x, IC17y, calldataload(add(pubSignals, 512)))
                
                g1_mulAccC(_pVk, IC18x, IC18y, calldataload(add(pubSignals, 544)))
                
                g1_mulAccC(_pVk, IC19x, IC19y, calldataload(add(pubSignals, 576)))
                
                g1_mulAccC(_pVk, IC20x, IC20y, calldataload(add(pubSignals, 608)))
                
                g1_mulAccC(_pVk, IC21x, IC21y, calldataload(add(pubSignals, 640)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            
            checkField(calldataload(add(_pubSignals, 512)))
            
            checkField(calldataload(add(_pubSignals, 544)))
            
            checkField(calldataload(add(_pubSignals, 576)))
            
            checkField(calldataload(add(_pubSignals, 608)))
            
            checkField(calldataload(add(_pubSignals, 640)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
