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
    uint256 constant deltax1 = 8833738114523234241961700168582556351409665088656289578650332355092209409951;
    uint256 constant deltax2 = 21572497176558552913060104078169917781107727215916375009020976658111372366491;
    uint256 constant deltay1 = 6915235424525365983086165056103755851794061837058687036785171368091389574248;
    uint256 constant deltay2 = 16423017652108143072325527846900236321120905316510160884497910357335074865104;

    
    uint256 constant IC0x = 11699064754201195007398527350253348403151481002046977275974914515794556464907;
    uint256 constant IC0y = 8377098824516723042209547366307545575336194904666442740719435968971891137137;
    
    uint256 constant IC1x = 15022578671217433728263017879847504938124709144805899886585104521700250021138;
    uint256 constant IC1y = 7439374227934829324841183186890967124081563506556263992139697902117577630383;
    
    uint256 constant IC2x = 8719884923846896418670370483026242120279461454392494350543596555692392150751;
    uint256 constant IC2y = 1915572466121040401254047597591235959434056701873531529685278614032487740057;
    
    uint256 constant IC3x = 15854458635547661044046209019901121787893952481692645870771021335496255904066;
    uint256 constant IC3y = 18580362195513971727529458597180322208793324937796157274539580854125510824273;
    
    uint256 constant IC4x = 20197620246128797797969231334172536167724314393789981313273934960930874757904;
    uint256 constant IC4y = 8652383402530547452977109949475477447090780660216084329098279248059527858257;
    
    uint256 constant IC5x = 6136418035854024647800871603208064108329169082713292338157990550507679741373;
    uint256 constant IC5y = 4148249731111469783390189175626927778451683234448732196893033887074109584641;
    
    uint256 constant IC6x = 435016271093619026896979316149581362925836421109084185028857731123245432006;
    uint256 constant IC6y = 21254951437721821548232352310541329777023953579777485090776415227787346519751;
    
    uint256 constant IC7x = 21278075374621156162040667851377496500311461883308769905293308585207243513686;
    uint256 constant IC7y = 12203663506086881329872300647846774063295289884666082497820328056490027198813;
    
    uint256 constant IC8x = 16308483425091511705934563714250777026234740651509189582674872217820098595375;
    uint256 constant IC8y = 7831547100064998764922162707495490598633878334974466872347123357740110689244;
    
    uint256 constant IC9x = 3291127262603144718778205947439511714981876162713868160237600958297179548397;
    uint256 constant IC9y = 21485037857784329908791414402133986495597755287969373075934534732305491839766;
    
    uint256 constant IC10x = 21016409257036220162904188391746628812174550025367627914783879782321883872463;
    uint256 constant IC10y = 771625434822550883448227440257963423499310868732489728802518320854402128338;
    
    uint256 constant IC11x = 848677157837511141352835832315266404476623536713045891337491496271705963639;
    uint256 constant IC11y = 8217347855861380271136078798483880852994161288399697316508954130226938484979;
    
    uint256 constant IC12x = 7950645217739479484822823131266057021165813197226380213090258700020405406040;
    uint256 constant IC12y = 21115671325929956654785783064024579377805406512650003241388844210050677251719;
    
    uint256 constant IC13x = 3626770947109436638554139078198740121299601968895373800820851494276106181151;
    uint256 constant IC13y = 1231434625641659068142386110297841563481701042171599336083256459050627128218;
    
    uint256 constant IC14x = 16049947947771356656284191511201202183176568879064579206986716057573639688339;
    uint256 constant IC14y = 6480470373974113105161133752760352489238403926514542525269014451361964382448;
    
    uint256 constant IC15x = 16974167980812170374822233712683695773735295177444364620936821746333456881288;
    uint256 constant IC15y = 8122261017527118496247636440450416615732682768376367625137811781672190179076;
    
    uint256 constant IC16x = 4370481621955946039258820475154973643976715870021068098944543782894438093187;
    uint256 constant IC16y = 9625487063950556055947770382866627694768814221480630062831377989311939157072;
    
 
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
