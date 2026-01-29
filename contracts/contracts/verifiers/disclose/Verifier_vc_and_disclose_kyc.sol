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
    uint256 constant deltax1 = 1022502948747070596300631872305350196366208813582081229292413330002410493735;
    uint256 constant deltax2 = 8307404806875602039009979465400882149520343934575147532878670270259674144681;
    uint256 constant deltay1 = 8725996148009629609617423651062395041554350094385944632997372312828608644955;
    uint256 constant deltay2 = 19505227144542990355285832777856832082655385455315296491381347497982380087331;


    uint256 constant IC0x = 16649376790350306128495410672000438222835355361873864679185308928608342391377;
    uint256 constant IC0y = 1365830659239397567654193478106544803466926587095831397836882385286292210457;

    uint256 constant IC1x = 12768368041823022971486465099843313755353560181066686496309262693573983752166;
    uint256 constant IC1y = 8959643464054312389755875312066576344157543684040889350558798123653714759323;

    uint256 constant IC2x = 8026951355325092256379108005740615512895662065129471323964253392093201472413;
    uint256 constant IC2y = 17729685419344675830181571225504519401370157618831493299320871505193568194542;

    uint256 constant IC3x = 13865750614916211164740113517816425481179265306761612472818567385469595810190;
    uint256 constant IC3y = 6210007189067774389269573600168370223250403017805496113623335642264819992738;

    uint256 constant IC4x = 16855313964021865460083277912281502340407051430688518561820294646056966683723;
    uint256 constant IC4y = 15265407205922489364865678414919162208795257265772110915033785419192236363960;

    uint256 constant IC5x = 18598823774356508040525215881560556738983729535652356395586704599152692518280;
    uint256 constant IC5y = 18145817576163407281749708126167770321482159783050035647989919114769433256079;

    uint256 constant IC6x = 7929686493832109041041190086485345905029205802382475316611421597823511641043;
    uint256 constant IC6y = 19169046602940406351907027759303697432610627026407453208752335429425017694574;

    uint256 constant IC7x = 2605668546149689485076733864456601989800612639397730351435615085329568572059;
    uint256 constant IC7y = 2242419572125099587271391127551951332349827207830958146376081280864531825864;

    uint256 constant IC8x = 17230061988111645534990582267868011734783232047326494254312685097544413153459;
    uint256 constant IC8y = 10806577457667861555253433417098515955632524053970338643826272138544403320442;

    uint256 constant IC9x = 3751984630395628299497200107740113530312143585224331604497180428031979981854;
    uint256 constant IC9y = 15676455188720477849218254715359881022685281346012746362600653176819367175994;

    uint256 constant IC10x = 9038868170600703467507268624782850799834426621476374278712452873055805013104;
    uint256 constant IC10y = 9698587198888135369066906249654396893723648003242241945599284193157738042248;

    uint256 constant IC11x = 6050467884563375668249040797272149300003806466909114026944043296882360309360;
    uint256 constant IC11y = 15900287959991498727296171595521639394049115178198151794906977584504380285297;

    uint256 constant IC12x = 11084322708760789175416300406920316493444723572225966905156819463716045081320;
    uint256 constant IC12y = 11218515196222567596688687943809578734267033209068034707100619316839921252394;

    uint256 constant IC13x = 10645041863169277188776881369692412104739148582039109401067090622235062084156;
    uint256 constant IC13y = 5266268354502390834581900591132009542571872858584466937449333517597831148030;

    uint256 constant IC14x = 12641747272597271663246870871466152965248117816492334493753291231347523232168;
    uint256 constant IC14y = 19526003775802419962730302158408658198175393685733749794278416969198861577034;

    uint256 constant IC15x = 6139284918750361257008863566645097867991292622068199456332000872393801256773;
    uint256 constant IC15y = 7099084867504428315337895159166860608559331005995192184490932820607010680845;

    uint256 constant IC16x = 9370432203154443644773178040475615441452364961035990256255996609230750218064;
    uint256 constant IC16y = 17951757691776403072537537626795200133221243393670030429694486485017127221358;

    uint256 constant IC17x = 21581607541319264321515681298226106781535771321110191776762670932817827595844;
    uint256 constant IC17y = 7631049069535860061742036261740730390300464507981117501570404056719958498930;

    uint256 constant IC18x = 16588935529361800732448688229721305142336631834288163321894359880448688608191;
    uint256 constant IC18y = 4976649298929967469596409013742801233623738930274577396507275281714439091100;

    uint256 constant IC19x = 13336088316263130029440976636885322206279122461816212975585641922353453096719;
    uint256 constant IC19y = 668527371723708514830022396101506352277923231593513590339198147917179128262;

    uint256 constant IC20x = 7911418535344866382682474453536883970529338904273675929069409842800763592456;
    uint256 constant IC20y = 6722145715621557485364045815849938484983110008747946723738151730812429418202;

    uint256 constant IC21x = 610873214241184085635414594211441831430912772471117234461302269567691174096;
    uint256 constant IC21y = 16969907768023728182903317862310886370963194429698287724301462949165910596854;

    uint256 constant IC22x = 659738555556673077218073955988504765951032248025470001896149485964044510568;
    uint256 constant IC22y = 2124464077179769137643014583429957482256390408775774347541901875987080182668;

    uint256 constant IC23x = 11040330531093768074742977048495269267038172161278331102262692904222746927915;
    uint256 constant IC23y = 20387648111599243028561521301140310714164415003338654058061856932087967245514;

    uint256 constant IC24x = 6937058621269922207815167233155518898032328662416059831807664411944661190679;
    uint256 constant IC24y = 3779340684837021741207549471402298796167963069596080462551336236827030143602;

    uint256 constant IC25x = 20956067714892758188531163534075112952656779768842660715243328162174316184647;
    uint256 constant IC25y = 9697689335367034906644638465039998846629732846527791686651080885302279721947;

    uint256 constant IC26x = 10803066158517027587330447158982829324243112587050865062666733319696533170000;
    uint256 constant IC26y = 16966880529095588436103115659246637747363575619917237189424029126730846465979;

    uint256 constant IC27x = 12430600018955874842029331801839308658974272583893366935707885910189427842476;
    uint256 constant IC27y = 14602780957678176966948503351865628319039612308733335242961008886115024541985;

    uint256 constant IC28x = 10923748125791784887614451982072899321420747436037959145471646494829305705731;
    uint256 constant IC28y = 6050274667868774010280923182747429242888928748472706014853484883020658961073;

    uint256 constant IC29x = 1170885743391113947515531032472753161485583617637753865725092942330476093342;
    uint256 constant IC29y = 19204742121781488340297839383055704899252648836617466985181418250802660585322;


    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[29] calldata _pubSignals) public view returns (bool) {
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

                g1_mulAccC(_pVk, IC22x, IC22y, calldataload(add(pubSignals, 672)))

                g1_mulAccC(_pVk, IC23x, IC23y, calldataload(add(pubSignals, 704)))

                g1_mulAccC(_pVk, IC24x, IC24y, calldataload(add(pubSignals, 736)))

                g1_mulAccC(_pVk, IC25x, IC25y, calldataload(add(pubSignals, 768)))

                g1_mulAccC(_pVk, IC26x, IC26y, calldataload(add(pubSignals, 800)))

                g1_mulAccC(_pVk, IC27x, IC27y, calldataload(add(pubSignals, 832)))

                g1_mulAccC(_pVk, IC28x, IC28y, calldataload(add(pubSignals, 864)))

                g1_mulAccC(_pVk, IC29x, IC29y, calldataload(add(pubSignals, 896)))


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
