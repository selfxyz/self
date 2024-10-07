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

contract Verifier_prove_ecdsa_secp256r1_sha256 {
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
    uint256 constant deltax1 = 2556163976507393294911465333918986586538127660099668775318455453333742871464;
    uint256 constant deltax2 = 9465688980578842513677378331100462310157400299307160690966673679972701874154;
    uint256 constant deltay1 = 9546005907929556266749014821510653674777554727409119268365177589832320458842;
    uint256 constant deltay2 = 7238933427874394887031458490749048961502439290010488901978519610341510726830;

    
    uint256 constant IC0x = 4671614552873899442431329605109796894156804328384916725985517119660246171943;
    uint256 constant IC0y = 7146082160473511968202120950497274295287543852794869000871427673586600847286;
    
    uint256 constant IC1x = 17938758077644424447606088344462504943336951414346971107325630291213336155910;
    uint256 constant IC1y = 21776159426549707112412754080604042145527801919025433146075927575388194646059;
    
    uint256 constant IC2x = 8857939828706198951430858595312330354669328913842527969441119226660764537431;
    uint256 constant IC2y = 19139575075638491920229394682922793064134734857603679221442123553223633343042;
    
    uint256 constant IC3x = 7720032174577585683512561786283216600532895787615790875243005613001421553867;
    uint256 constant IC3y = 6870244881886509291223962997196667056959437721412093637939651093150155592447;
    
    uint256 constant IC4x = 14479257276788086367256283973087971390091256628438552940733970375582536499492;
    uint256 constant IC4y = 6196964138751552001914051534682195175020586742612584532037032632731083191848;
    
    uint256 constant IC5x = 19800869320865914716525164777524995547910578822111723399864160971112925205034;
    uint256 constant IC5y = 1450696739347526808454706412521222053459750807118311185579790123500185451038;
    
    uint256 constant IC6x = 17218834774709800867879531611856841929848828015424270025280105725856759812790;
    uint256 constant IC6y = 15776966094329466200744612581594868148136917081027110983420234267175036259265;
    
    uint256 constant IC7x = 392631983651885061516936123584220805054349858319039665202178699461886295765;
    uint256 constant IC7y = 18755469472344552191602626086922941400639719363317651715546965651372802897408;
    
    uint256 constant IC8x = 10663254638552309370158720218482325424268267395526138965003346744711423151535;
    uint256 constant IC8y = 9834078249240184336550229610851326461227450794011274723711257724579021839921;
    
    uint256 constant IC9x = 15531312119088976826702261515559642744179452189498187110224843873898805600304;
    uint256 constant IC9y = 15692722374438255034744850794077941037882198243312535394986819163457854665206;
    
    uint256 constant IC10x = 7805139660704471422643835194185259944614958247055818182528312680465566574943;
    uint256 constant IC10y = 18989902369327466788116237001401943484692262496235213555275200964709058484060;
    
    uint256 constant IC11x = 19503827254151880671274001494325367940961570646531209741340418477642609571810;
    uint256 constant IC11y = 13564099145456749001013715860091952448500299204652346909545958981298852480555;
    
    uint256 constant IC12x = 11322377159136652410949962775335983309119316109047311128253047902862491207254;
    uint256 constant IC12y = 11892491184068644955916383448640226465258714796075908221730653870479503115387;
    
    uint256 constant IC13x = 16113085825352101281283074013421161625410907514656703551989032630568223541607;
    uint256 constant IC13y = 9139848413980553724074247316431941455111796565347399731181842092834755037749;
    
    uint256 constant IC14x = 13425094652344920472267094575963471085420966370842045071415112012243350406184;
    uint256 constant IC14y = 4160002327405851189941902816021573216359732649327208343785640124065645493538;
    
    uint256 constant IC15x = 6883733829422688790584192030011766926328035360953086768554379456673097681231;
    uint256 constant IC15y = 13189400144512545613513232735471805995792483299825594844756472813243198415033;
    
    uint256 constant IC16x = 21198687219971433124745079894440703627026385706406226327372885244093569198467;
    uint256 constant IC16y = 14520710240552885640933820579665361349200344993791090158950940282869003647008;
    
    uint256 constant IC17x = 13129926517199152620337916574220251941999358840772527364249505092837723800292;
    uint256 constant IC17y = 18173333970176365249277092374893388354751274783960955870166786300159243204911;
    
    uint256 constant IC18x = 15392827289421722126131708290585975424007256939062797100868156363253503226288;
    uint256 constant IC18y = 10356099191718919354097895311800202501631326758022671653174794792911979218053;
    
    uint256 constant IC19x = 6694520247366108714068766408361615699641192117549024917004613468300915895904;
    uint256 constant IC19y = 128595250387207659555490025828984538473625769966996709445216718424022504897;
    
    uint256 constant IC20x = 18476626171812589209629911305590380435443707947165570645138330993127915200986;
    uint256 constant IC20y = 1250266588970592205610402748018733022377356385774746334974402160134331379315;
    
    uint256 constant IC21x = 11613638329765699663965492707323053152858658598685161673455789006334555310239;
    uint256 constant IC21y = 20916656868414642577747133846950155612320112068556270735538421254772194151961;
    
    uint256 constant IC22x = 19938064540149651425847888158544734736940638307223585477993298208985289221237;
    uint256 constant IC22y = 1748244445947912937244445790624652629686816510950297866362396955212970193767;
    
    uint256 constant IC23x = 1228603416971046984907749118012997148684542205906900835509960939705125920882;
    uint256 constant IC23y = 14399515490647720020980013426304573696372643580171230123918498233035594536525;
    
    uint256 constant IC24x = 15162616959439663120986986895620728727843935424413502078655999376503077185130;
    uint256 constant IC24y = 14379413346942258848499636176776913524806859156599618694715300736588590975469;
    
    uint256 constant IC25x = 21858455802914138961008709916060645897231403710719467731751693874099418686369;
    uint256 constant IC25y = 4598100006466722738095662087260929807687774097678540912039382633698200278489;
    
    uint256 constant IC26x = 14680480462870918273048506219337076627510435889419254573802723032879879520459;
    uint256 constant IC26y = 11868744534085031160698651559019763963069010902672837330057230561464215168084;
    
    uint256 constant IC27x = 21434501984776024393843823827076786041850932273745678968342406976850833905988;
    uint256 constant IC27y = 21766979981205653083964154874045052423742487332994568346934087513310851352409;
    
    uint256 constant IC28x = 7305994117514782130849747036345617844882591237024993719350041907701417024819;
    uint256 constant IC28y = 9061543038383350440060027544973137241105026070025279888042068524209874508365;
    
 
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
