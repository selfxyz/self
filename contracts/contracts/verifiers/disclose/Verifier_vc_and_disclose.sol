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
    uint256 constant deltax1 = 21065329734864763713809634189736384930216140267680185743468361133305512567820;
    uint256 constant deltax2 = 19884021869610667485143531869347288785694671472104782876182233086297022907304;
    uint256 constant deltay1 = 14286208417420085177729398217973335216644892152424865361488103401383069505779;
    uint256 constant deltay2 = 18560480605280333001041652536764875391099001795499977327437993275506400956521;

    
    uint256 constant IC0x = 1327643666632315025512187418817023630780563184758021455663314119872437463145;
    uint256 constant IC0y = 2622893971724901828914047259052067392447274440848954417614321746778812751881;
    
    uint256 constant IC1x = 20927011517723457008102782318397010921983294435880612972153120487747261995333;
    uint256 constant IC1y = 18649509350577586920402079427241751583571095028055506078542019996865511703564;
    
    uint256 constant IC2x = 18223545039205454783148203870836982137410477518180720119480480153635557174304;
    uint256 constant IC2y = 14354250107099459449970545617224325946145147040253960693477698870437037762909;
    
    uint256 constant IC3x = 2173758372018833803307650315845499838285851237592930252028174525580546546212;
    uint256 constant IC3y = 11484957593605555554581664590508364277322965026091620635584632890824112335330;
    
    uint256 constant IC4x = 7157190044841716686091632308502737011979099809606870421939953854408747856731;
    uint256 constant IC4y = 18315602217937620885107757034463661543707738397425161578650110819142660670372;
    
    uint256 constant IC5x = 6260667805546381923858902471892397126243269313854577708606218376521908362565;
    uint256 constant IC5y = 13716486493605237311926465265255870345358784266311689841198776426559442954137;
    
    uint256 constant IC6x = 18606363599559637061941956230491916987222537133370229590923171484462919701227;
    uint256 constant IC6y = 2433361506657306508828144447793032310343955443449067717401403184301651823995;
    
    uint256 constant IC7x = 19280866248824868201853947527606978917049858969164646547147582117900910165818;
    uint256 constant IC7y = 12004989744914315761708669577255110696291165332282234776831447906508334174065;
    
    uint256 constant IC8x = 9499667142250207864939084997366463919158967968217947947452929384485105655483;
    uint256 constant IC8y = 7934640485738501605809283862245180894070081349952179321671898117937450554978;
    
    uint256 constant IC9x = 20248101600931458686357220379631192702866178668147896841612695942649039306904;
    uint256 constant IC9y = 17146962363094782772160475831653226068881596057834124050728488367347134754895;
    
    uint256 constant IC10x = 7698102871102525311081154517506621927872860404243843030208612865041171291679;
    uint256 constant IC10y = 17451440288940059901172619610591057928798945050984287918189963973980684490936;
    
    uint256 constant IC11x = 15522722806663355688859428499986250804296589439746832906847538630162245728449;
    uint256 constant IC11y = 17731443422876322849401673846065881492578186542336670047706150379276239434736;
    
    uint256 constant IC12x = 12339816027317431982064382456180166106960325372245286406655416854868988899703;
    uint256 constant IC12y = 1623004256251937705099896843572191766950534593682479744120770181852683481461;
    
    uint256 constant IC13x = 16216101416188390585624804230286907502888542435957249996363202481890837436823;
    uint256 constant IC13y = 19792033164136600401729520568052979301967100486751550563922332851674279231879;
    
    uint256 constant IC14x = 9526823787561424517694409522408689943116198117932113165892430928752383410927;
    uint256 constant IC14y = 15425544394205620802764497690404474607132882651029664273449118268473325168573;
    
    uint256 constant IC15x = 21379552168442334118192987128570335250484225781188878794769111112730685255680;
    uint256 constant IC15y = 11413252397601154464320301772186050681727031323285046472485957139652053961337;
    
    uint256 constant IC16x = 20428162085801543636385155875246864224732967575559765504978908153515749149989;
    uint256 constant IC16y = 18815283633327124443616880398781266901051625797588830712455957697615424697685;
    
    uint256 constant IC17x = 14469038019687287252080675455019765736968071520512741147009183358330281848192;
    uint256 constant IC17y = 2254410426995330112169610023372576019626185925041252653212723256001596932807;
    
    uint256 constant IC18x = 6646738351527040290587708010640343681780304778150763218965087230163505094741;
    uint256 constant IC18y = 7224595387826330922504236191632797623787710821043271778727414843835083051307;
    
    uint256 constant IC19x = 13930005350988118664410913458609814475220380700610122956318720762892362913810;
    uint256 constant IC19y = 1510210795288547564147036133366552832970234430196908175239728458476685653344;
    
    uint256 constant IC20x = 19395101085598768787243131602792145650244700025278061861975309911987787383833;
    uint256 constant IC20y = 19593647464319651444688400549955086154512565325512427576174534610645336455682;
    
    uint256 constant IC21x = 6877461228082443111890464295830127588035564773913061145705260000890224419695;
    uint256 constant IC21y = 13729662662934324858332564018609296055385187918293000684588750857191114304504;
    
 
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
