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
    uint256 constant deltax1 = 8171490868973035653618389657772146026236512067359299504309976808339221455945;
    uint256 constant deltax2 = 1807865550635575770017814887379982633906963839491898267425392469104017084552;
    uint256 constant deltay1 = 8602714637931053909502061851816609649232437288868154346453227155271177632417;
    uint256 constant deltay2 = 21310521141589807574981105059592063768735060690323471826550806455469133832811;

    
    uint256 constant IC0x = 10370114202803665532060425648722146044484953054751202671816311689407444400285;
    uint256 constant IC0y = 20225806570051915084577741156680748839395520260102982526309007754599167362942;
    
    uint256 constant IC1x = 19793438079481169790503723923576953737891333839146034001623832407219491185982;
    uint256 constant IC1y = 9611320071378602154373099346396448153453320171612885404185603984733259874502;
    
    uint256 constant IC2x = 15577274887875065727830529916974247266080273299500986393624177808881844105458;
    uint256 constant IC2y = 2909584355372775068014405275787614464185864635563495253664515300652049508078;
    
    uint256 constant IC3x = 1611434623096275982353137765374561994339530955990548567664588679248441915822;
    uint256 constant IC3y = 7341809136954563038332980172966204368435199947803318266952287781869732056571;
    
    uint256 constant IC4x = 19104924222643198084431851367233038043364967449152524119061286392024460680099;
    uint256 constant IC4y = 1014489770504161800713018569889418072854581516993176287754674058045618764306;
    
    uint256 constant IC5x = 6445424243111902289315608266674568736284504125244535662599509232705692228248;
    uint256 constant IC5y = 7283351424218467385412970040529873065301308198233350248746400016221436170039;
    
    uint256 constant IC6x = 13425791861360394315115814064083706979869043572496127159201833044695672386878;
    uint256 constant IC6y = 15578003913890810487598763681030022715665320438878490008042632481055787820754;
    
    uint256 constant IC7x = 5172057316071336271595504686961033301542480548667356242556592185190011398706;
    uint256 constant IC7y = 19154313264513773521059877922269063784064636615101184047595423091086807566031;
    
    uint256 constant IC8x = 16377284334493500132959454653341162887814767612915218269395286826010112459690;
    uint256 constant IC8y = 20224926814266060966800031273139855319844637705626961479766586081588206678331;
    
    uint256 constant IC9x = 7965669957734426434458064802472546750277950575141028645950669458810361870079;
    uint256 constant IC9y = 11507823166516055882389647087058284246879381991833399399507252753957708045817;
    
    uint256 constant IC10x = 17804088622564134938337284659865428217531362824108453821012709676778261837785;
    uint256 constant IC10y = 6097971449256607361027458787703346794661348460701812374200651044304900381864;
    
    uint256 constant IC11x = 4365733824267549039023853586880515319995169553534966127481399704439209111066;
    uint256 constant IC11y = 7499405809531594369733965832081720292618845817351996655742211875827702783253;
    
    uint256 constant IC12x = 18166151688586651790998810625849019731041554544972724678380373880064207146838;
    uint256 constant IC12y = 6395405251436601030385590882118285291248208995361099899753730914151183577401;
    
    uint256 constant IC13x = 2637649946046652403005035921404943786642980114479052521311855116540691483613;
    uint256 constant IC13y = 16554722544462388106834147558649721977049807011636823368312187172507437343924;
    
    uint256 constant IC14x = 15158741949128055300286589383346786989343917876687455971039660124801987917109;
    uint256 constant IC14y = 13647951541071800908877872537973730769158352273596112008158439498600386539419;
    
    uint256 constant IC15x = 3798683298870163292202662452405569093801861513507188273992576196452316072820;
    uint256 constant IC15y = 6025156645397990587695686222337436310863041572999135939890010310508770619734;
    
    uint256 constant IC16x = 213849419412509355139745211912514062293842562550822460598245270476834598696;
    uint256 constant IC16y = 6966444116300101516706654479201725235707430678901257415922050446151654022150;
    
    uint256 constant IC17x = 4443493404788309304733358127389868369452918828959966155290898941847676347265;
    uint256 constant IC17y = 12617942006566815577976507570351371012452401071846706141123841006383608274549;
    
    uint256 constant IC18x = 8818457607679841061717595228441089388639495166474364985982727537718622446541;
    uint256 constant IC18y = 17722870791801697423500030065251803027417453266264029375779545878068863207286;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[18] calldata _pubSignals) public view returns (bool) {
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
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
