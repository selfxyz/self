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

contract Verifier_prove_ecdsa_secp256r1_sha1 {
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
    uint256 constant deltax1 = 20298706606450799095150603042764192412185451742565251820624032862213660593081;
    uint256 constant deltax2 = 12148042449615862272447061264962001193403390702154605653931715402136255888144;
    uint256 constant deltay1 = 9821194073178908816865185527999015667277975509805470624355346023407832001644;
    uint256 constant deltay2 = 20119588625623452847311671955128331219133816585122913359578583545007232481973;

    
    uint256 constant IC0x = 3787143984046965042762161096853321642320728535394341455827353904304858418542;
    uint256 constant IC0y = 11109265273283582975017069548449855108817119190576688420281567246632749383793;
    
    uint256 constant IC1x = 7169857886991911635723884357268024018556495096771462109894761965505146316566;
    uint256 constant IC1y = 209243788295899152079106787116178701788649152895366816780748114603909435867;
    
    uint256 constant IC2x = 5087024437244286577634349776999391463909347480907993895620144060041471235057;
    uint256 constant IC2y = 9887437615705728475035889262726754522217898583180878154233745519250665406757;
    
    uint256 constant IC3x = 9096819064619914108812151617435257738385585036226581648402917316224213531741;
    uint256 constant IC3y = 1586101697308704353391433827033399208826299996897329853713423161258454541603;
    
    uint256 constant IC4x = 3771848009928751621022260556987247505337425134568059246837929669895492533068;
    uint256 constant IC4y = 11020821642724177775379776165414002633259070190197525547844756129132702297273;
    
    uint256 constant IC5x = 18144005434754039074188394956490978237245681340351973814915665761408819336086;
    uint256 constant IC5y = 2805163409081888844178215908169990720610945416554894493928973305624618562398;
    
    uint256 constant IC6x = 21216290381737424883772282753599539609506013153098453639859736693977406332304;
    uint256 constant IC6y = 1545017137323650823621696989948565801159572730669518622389691151538123757827;
    
    uint256 constant IC7x = 16837601375418560525310348912276640515728073111133433171932702233253816163118;
    uint256 constant IC7y = 5235011085452603449665987116698720488606958905190334923411698486940433658020;
    
    uint256 constant IC8x = 15265981856620826441373599455986283094127037453504545132275578406223491186568;
    uint256 constant IC8y = 7545637001619751366309843243381719243820500996740386887828375472423088482929;
    
    uint256 constant IC9x = 13580715768730619216722992288229397550741310175137714043441169229762716511627;
    uint256 constant IC9y = 3371722364552562649698922153053886083957557292053520101716745172935180365956;
    
    uint256 constant IC10x = 7575570755054340978718554140570910985146567597550024607396767969342506705519;
    uint256 constant IC10y = 21287422384456904469246033714250429955150285863903469464610837711045895119430;
    
    uint256 constant IC11x = 7638712284505879566443093274026543168403724834398207087506087849538564698372;
    uint256 constant IC11y = 8213188388104724157252244547037342187147057226008757584643820103784201526209;
    
    uint256 constant IC12x = 5576821587837295233018785054567859984561314905714210600040208647893441486897;
    uint256 constant IC12y = 10427547642420493580424211843772481560561370246095075477546399434568643099525;
    
    uint256 constant IC13x = 17133239377714112205633090627619438250858455837698682568987833488169632687337;
    uint256 constant IC13y = 5200359516026822572476488027624983702276348139584397010733649636826168536967;
    
    uint256 constant IC14x = 4017347891409874324148380519997347801987678667872050585165247959441998967519;
    uint256 constant IC14y = 9958191203736974129344119976633170692025035489412698655088249922637961993314;
    
    uint256 constant IC15x = 2143305489498724426806836125036055173008000540426657972605721132825653803419;
    uint256 constant IC15y = 7952124537024756382945214953511274106208354784239725908759557954990218665322;
    
    uint256 constant IC16x = 15579322015395295431992513588184434849072262976696281748088597542033691882960;
    uint256 constant IC16y = 5538864499491354803573102357169447137773545480880816587501878166186221640911;
    
    uint256 constant IC17x = 13812020956861770965864321203189735578214139036669132580590175634664368882171;
    uint256 constant IC17y = 16053055889278569707420648763889664840095094616708316900928826089286777058041;
    
    uint256 constant IC18x = 18053849838287568445830794778930926650119967616947075610394647911056678497230;
    uint256 constant IC18y = 14777274211127194851617156243556604806539360054430758217314378656016157145764;
    
    uint256 constant IC19x = 7807115563760451354429626099284216180520028924208742506091568947716498185221;
    uint256 constant IC19y = 13882042474895173410881370750987489260869669814163101222601795088017092862292;
    
    uint256 constant IC20x = 19570568993855062043947731790180784816561833117409251049224326727720110272786;
    uint256 constant IC20y = 5340250477283741793088901944737669069504923867477577195762870272842848975757;
    
    uint256 constant IC21x = 16408437315801122112365096205355933987479602838793812368551052187554838627338;
    uint256 constant IC21y = 5346311287867200980866010714265206904239849663903103373106438077869402530389;
    
    uint256 constant IC22x = 609460229456733463170878739910836714568504542072375330427892758078906501754;
    uint256 constant IC22y = 6636179849943163794815641975216968369301481322395682843028291813271074472891;
    
    uint256 constant IC23x = 8988437776752115259787729726546966555759273546235987998384078350339025226523;
    uint256 constant IC23y = 5546910729209455534198209712122430900494077795132481399709820904338628830077;
    
    uint256 constant IC24x = 21392284826202381633756263568150044165466145146590331239690825815479286557564;
    uint256 constant IC24y = 15388270053136019733665990485967050317204756480496853490097004088478167202720;
    
    uint256 constant IC25x = 12339737432838334784251927153821366169896518912891798928014558839390334331548;
    uint256 constant IC25y = 1227838418094015629644071529070619330250683445535223905241404625398791482193;
    
    uint256 constant IC26x = 8101372400485534489849668291467531003139354741607584072145721043990031266677;
    uint256 constant IC26y = 8049209042690454428292584936805273352295510195204281742105929249871979322903;
    
    uint256 constant IC27x = 3545439588911389510056702361302084074204456626753470443941631782652443929157;
    uint256 constant IC27y = 19937151984298640732035119357642918589252501887347130649465743024161213777363;
    
    uint256 constant IC28x = 307150408335327624748340599034455756640245641484411562493508905059497608846;
    uint256 constant IC28y = 568464401798406384672198582411537852417729406326618145543949158486595039146;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[28] calldata _pubSignals) public view returns (bool) {
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
                
                g1_mulAccC(_pVk, IC17x, IC17y, calldataload(add(pubSignals, 512)))
                
                g1_mulAccC(_pVk, IC18x, IC18y, calldataload(add(pubSignals, 544)))
                
                g1_mulAccC(_pVk, IC19x, IC19y, calldataload(add(pubSignals, 576)))
                
                g1_mulAccC(_pVk, IC20x, IC20y, calldataload(add(pubSignals, 608)))
                
                g1_mulAccC(_pVk, IC21x, IC21y, calldataload(add(pubSignals, 640)))
                
                g1_mulAccC(_pVk, IC22x, IC22y, calldataload(add(pubSignals, 672)))
                
                g1_mulAccC(_pVk, IC23x, IC23y, calldataload(add(pubSignals, 704)))
                
                g1_mulAccC(_pVk, IC24x, IC24y, calldataload(add(pubSignals, 736)))
                
                g1_mulAccC(_pVk, IC25x, IC25y, calldataload(add(pubSignals, 768)))
                
                g1_mulAccC(_pVk, IC26x, IC26y, calldataload(add(pubSignals, 800)))
                
                g1_mulAccC(_pVk, IC27x, IC27y, calldataload(add(pubSignals, 832)))
                
                g1_mulAccC(_pVk, IC28x, IC28y, calldataload(add(pubSignals, 864)))
                

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
            
            checkField(calldataload(add(_pubSignals, 672)))
            
            checkField(calldataload(add(_pubSignals, 704)))
            
            checkField(calldataload(add(_pubSignals, 736)))
            
            checkField(calldataload(add(_pubSignals, 768)))
            
            checkField(calldataload(add(_pubSignals, 800)))
            
            checkField(calldataload(add(_pubSignals, 832)))
            
            checkField(calldataload(add(_pubSignals, 864)))
            
            checkField(calldataload(add(_pubSignals, 896)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
