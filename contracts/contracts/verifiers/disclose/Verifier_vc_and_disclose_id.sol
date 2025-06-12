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

contract Verifier_vc_and_disclose_id {
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
    uint256 constant deltax1 = 2570683437117593959871249718321087344182581865653762639494656774741884774451;
    uint256 constant deltax2 = 10791937519136459850121173854513919670439026432248975480520108456769523413706;
    uint256 constant deltay1 = 7697803293347511746398205466597805067891748159831340108443169903730430911531;
    uint256 constant deltay2 = 18135141573537061188590013042324734692899788683249633264832904379088420521347;

    
    uint256 constant IC0x = 5856920506801943179747940431507261587545690354191837904074746625856713057019;
    uint256 constant IC0y = 19124539120756340306225201952668471579555384876400327849356328019845881097562;
    
    uint256 constant IC1x = 3907275788156399155726133032274445611289536322362606696599801283854580295437;
    uint256 constant IC1y = 8451119154682439762054395905067543035497291620054904162598329277934126172016;
    
    uint256 constant IC2x = 20530143257595175213619797207279919184153764911566159122843961254673243634293;
    uint256 constant IC2y = 18418107796075636508766997478881789861884175034155105905934657000306915821371;
    
    uint256 constant IC3x = 14368654893588239986356440315957545435792265903841511372331944472664329358460;
    uint256 constant IC3y = 12284629478683204119754717091716141149657267016652380030058008792997116131875;
    
    uint256 constant IC4x = 9578716983925369516022217522731093507962466534359837901987460531141004851058;
    uint256 constant IC4y = 11546230489007268978353544383968439771367148945013199458278541261408798518042;
    
    uint256 constant IC5x = 20186291580274548265191299475582935526688657371386630094736889868165148343049;
    uint256 constant IC5y = 7066081396404019076294461314754121975461942238116236506003634245369912659348;
    
    uint256 constant IC6x = 7223725756527208741423329209765674164138947999927552108248321109787428330576;
    uint256 constant IC6y = 7090893321878038809726547992284174238790568751222590654054815492845205850020;
    
    uint256 constant IC7x = 3508039657302366273723082871441943167324729420192561664273405366370025413334;
    uint256 constant IC7y = 16077897542007852149081275458028106372577804015189016149401990661491415919989;
    
    uint256 constant IC8x = 7157834980199389511778623097557341082580034352641045942337042309147987264745;
    uint256 constant IC8y = 17810088059705235516956644702714110398594370075197014246657966746880992708168;
    
    uint256 constant IC9x = 19990085150526235401122450579432100767788242749821689359772693208891467804622;
    uint256 constant IC9y = 11875741660249391520213283913162030612995484283095257075118031592533202953731;
    
    uint256 constant IC10x = 565576411533726770996320843760026133874517147039816053645457725776038253277;
    uint256 constant IC10y = 6930421180986466104206189528520482999522362852059930498501019935177194699565;
    
    uint256 constant IC11x = 9687304248878239799475267106341943076035784248337790140346422230644442528821;
    uint256 constant IC11y = 8718390928981091008213508300667652242975655218883879916045519674874973495651;
    
    uint256 constant IC12x = 13400562939760543038178200762869273415986171711360997974863414188041195677804;
    uint256 constant IC12y = 19454142021037427981814241940238985741634162007055597028328858197655005999592;
    
    uint256 constant IC13x = 5304642595939683424612415509804552638020604037251875803456909825635793998553;
    uint256 constant IC13y = 5306882009576422477327808720898870532843294871978759595546305216807124752880;
    
    uint256 constant IC14x = 14031793532934637725744550192616647697277176739864804433516834701426772096040;
    uint256 constant IC14y = 13997965923135752232663850400013330288274429042096588718589372655870427909076;
    
    uint256 constant IC15x = 6857315285146692182841362377259336559693847336499456322687817740418786750593;
    uint256 constant IC15y = 7773075738364850482446135825145951942474724287022442267891210024402400169358;
    
    uint256 constant IC16x = 7350867218242766859946239631839980088884228896188196079908494306313085242757;
    uint256 constant IC16y = 16585312954662800633717122107305570207242746661443177600922110732010586303604;
    
    uint256 constant IC17x = 12371794706813431625295862613989653271433404490947256703099159689503429758617;
    uint256 constant IC17y = 16874395293051993576135801684114190330547607587787157588928779976192005582901;
    
    uint256 constant IC18x = 18408185524203075886684659649084141997263054479485752795420181339411166689531;
    uint256 constant IC18y = 16243204335737707642434624849163560305778796389979434010995242909912410681115;
    
    uint256 constant IC19x = 12827474512217515366731958666602059443683014227879101851822634933350038305567;
    uint256 constant IC19y = 12103285317170015797205692728698593084779876459612203243369112597137507623396;
    
    uint256 constant IC20x = 21871607573936419852307486960157754714579931787264995102940433544145315016287;
    uint256 constant IC20y = 3793515164944941168720752793034269182533154487955578472737823429132294441082;
    
    uint256 constant IC21x = 694085742582167480921564969992368553233272238548053666297768861621687596406;
    uint256 constant IC21y = 19146278969945936933324725088253247909700597465969498560427768702663925772917;
    
 
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
