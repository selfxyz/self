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

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 constant alphay  = 9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 constant betax1  = 4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 constant betax2  = 6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 constant betay1  = 21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 constant betay2  = 10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 3037890460429929853828629296742086109008517454031147703442813108881426331381;
    uint256 constant deltax2 = 11415705872230497398160420978210813941423805400115940468997080730756770095941;
    uint256 constant deltay1 = 4781886835288895006988886960857872859778352874458931312709265942186357137609;
    uint256 constant deltay2 = 6660151851452724449234553790200573309196429136517999261040530971073361464771;

    
    uint256 constant IC0x = 4897812530436581420070048815704719785256466787655503857610889333796081821201;
    uint256 constant IC0y = 21324217308758963004039464033551222626995062428505595457846546072979649950535;
    
    uint256 constant IC1x = 3402067829842345916430895428185245090645621522198317090797379965574771542636;
    uint256 constant IC1y = 15689341079133962080137763365487039194375030636040098473539254350433970371666;
    
    uint256 constant IC2x = 17395362500217368985868893090734905039167826866091632900857231867723495577602;
    uint256 constant IC2y = 7930260148586132748363663695528567251481992615924576457603406418853534765181;
    
    uint256 constant IC3x = 585494952178863414068208567603839798093905284375122061973360892129986520320;
    uint256 constant IC3y = 9052106461455604192832593945466435172808609013430707922648579604917214395471;
    
    uint256 constant IC4x = 7009544555987721721525965879762930953012066717281509356647068054408609863246;
    uint256 constant IC4y = 9820829334259318510794834811753840115411696228971683399345859623869811549881;
    
    uint256 constant IC5x = 14238418207024939545815829157744718461870627038741425938816007286311574134474;
    uint256 constant IC5y = 281828200475697177916593309667507636329345262293367509851063337891478088781;
    
    uint256 constant IC6x = 2588875801176981985506740691573068253787601389179711941209167172577223524972;
    uint256 constant IC6y = 15518320710469760878810555468816349074382837865578096899468878146062509663814;
    
    uint256 constant IC7x = 17316533695265131380437649603796400699657451230738779001098608159520582988369;
    uint256 constant IC7y = 8192809588256960378913803069056080395056022087843425771582496472786713726350;
    
    uint256 constant IC8x = 7407001681033909392094003743482787694603426004447721439357204522366208646546;
    uint256 constant IC8y = 14678011064151490372018354732758508739891026527348606433971585164806457243690;
    
    uint256 constant IC9x = 14324550585252189304511012915310919737099760521255841560510202883547241215550;
    uint256 constant IC9y = 17843516173433864891394764190574725294294272661192260445890002683170043518436;
    
    uint256 constant IC10x = 7539891259658208616633326740578026995822087197681333710337145994575633967330;
    uint256 constant IC10y = 11252528180616460725708054390959401682257312545535188972038868508936671228701;
    
    uint256 constant IC11x = 13300379642556942794398405666278194834327040509717856013516915921151482858342;
    uint256 constant IC11y = 3765685546823952453740511654773017065896884149593650080085427606727523849353;
    
    uint256 constant IC12x = 9268919849281685133024784239234560640021437913056581963083327429501365255031;
    uint256 constant IC12y = 11222912618976361984001818562665888490194957370177999142904578411305511279126;
    
    uint256 constant IC13x = 2597478889552428352737130179687206531821645186216868965539289093449836402726;
    uint256 constant IC13y = 757968852987628828382971340903318389342984851650872494795704692702408158904;
    
    uint256 constant IC14x = 16147563600769233454259564579865458680953713847620754688678964339139397943562;
    uint256 constant IC14y = 3229058257062194976564868360849873757615447419031013710509312378420932332089;
    
    uint256 constant IC15x = 11276405747528923910383092138862864843497716277810279291090775583122182049041;
    uint256 constant IC15y = 17478497004985764197329627914040721906294759410027200889688899456335265284727;
    
    uint256 constant IC16x = 7537276704716430448981792598508402432998887447285614055846784939499149706536;
    uint256 constant IC16y = 13397681836333574838145763582606233729786782316119672353292568940401561429759;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[16] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, q)) {
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
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
