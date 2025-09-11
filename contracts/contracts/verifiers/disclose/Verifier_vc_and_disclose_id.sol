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
    uint256 constant r = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax = 20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 constant alphay = 9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 constant betax1 = 4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 constant betax2 = 6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 constant betay1 = 21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 constant betay2 = 10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 16844304914544206633570561761027148884941932611757292912007896382077100268910;
    uint256 constant deltax2 = 5317032611889952964986884162630370682494245917371257174741428596650708627427;
    uint256 constant deltay1 = 17672834115105671249057453396651777199406039770352867798606833555779180975294;
    uint256 constant deltay2 = 16550121320029635161714685943187905842339715751867587658369965347212135477854;

    uint256 constant IC0x = 3063892752580393445351912389462972315890804098703268907764093846143370118620;
    uint256 constant IC0y = 338898849216056337039782474551419657442556214016589819494522848974041783478;

    uint256 constant IC1x = 6940512344612378275596355639005034678720059474894564045852719617049526670592;
    uint256 constant IC1y = 7271317249041914428407540854687811589115239252968211380262637546965156254207;

    uint256 constant IC2x = 3314486677771826005478629497878600453502704803604117634088504028781562260182;
    uint256 constant IC2y = 1459013185406293898811099700625611314842810760325719700639326068324009385596;

    uint256 constant IC3x = 21339354103630425157547151549834296358105146168981889077698894723212845838566;
    uint256 constant IC3y = 1502070405736269547167924944653885169736140888189355495638232415069862575598;

    uint256 constant IC4x = 14396426832793031310666335220247337038928200466826171891279598291110797062739;
    uint256 constant IC4y = 13835629778228014281391775241314472918522406202606518031388221683433169763950;

    uint256 constant IC5x = 7695555391914963992082972585044820108938489634468335855895726466800632339079;
    uint256 constant IC5y = 8190077539285758088627521485228441232649488415444971100428498049840976226761;

    uint256 constant IC6x = 2417278349200277234395537419160662854805515444384573884365149909329785767036;
    uint256 constant IC6y = 10967597226655782922172816985654148489973967823132770447428170201506876668600;

    uint256 constant IC7x = 20295352631233733875881528965574700292586915911951616910462312161657295185313;
    uint256 constant IC7y = 20082302768596838216870403751325135105630414436618584815984398612522291508765;

    uint256 constant IC8x = 11059827409898927086744943143248537120981080541595077451819524689731328313055;
    uint256 constant IC8y = 20944806256306983934313871670023039619806058515124706251817080000146458395831;

    uint256 constant IC9x = 18259578827946459664607509870902194427526962214477984213929784003451127220094;
    uint256 constant IC9y = 21007858375090063424404486960612952186095225779804513006019450439527240860763;

    uint256 constant IC10x = 12982483613179961834997686044638693151117200865260657581197810866310575092501;
    uint256 constant IC10y = 881050844966282182331005719786290913799458655589383180589908624858220859602;

    uint256 constant IC11x = 11841059290702184133575026782423678355552249188591233355680911506042852172793;
    uint256 constant IC11y = 21162685042783600449151295113027715814961611113193595910359022152766997832698;

    uint256 constant IC12x = 14775614741163273375675559595724692959987623649519993915008330984244882193158;
    uint256 constant IC12y = 7287309786402623463914647044896199277350925828035868765984073573672653028741;

    uint256 constant IC13x = 17996181553752736816877495333540760200848413454433427091821989699950376553849;
    uint256 constant IC13y = 796667563767138218966273387445927104314872470366395704215052203609704727590;

    uint256 constant IC14x = 16069904141003091209542236685411561248720682567234042060289476902937954168846;
    uint256 constant IC14y = 158923544116241905975145642791234471241344480125334901482809895066319556743;

    uint256 constant IC15x = 15596493027697592322862621020343577229490713781917504414161395671723032987373;
    uint256 constant IC15y = 3197667355446945179759515532025053591979018955754978250444717842400175295359;

    uint256 constant IC16x = 17557830129416623434101866717763963360406031535965420927807273907570290242676;
    uint256 constant IC16y = 6371040553725937017356304924377900009836693409950628837714053387420159017375;

    uint256 constant IC17x = 5038594046636670102389675511742083125240656824016073907356961248956227939717;
    uint256 constant IC17y = 14539719964108900696075513251178141053421038041902227039252320419763540194611;

    uint256 constant IC18x = 4952500289282302627801848690727935795511793886005474219488896581408334483093;
    uint256 constant IC18y = 8796843519751719503761110444663819947854438782165943987407121035538950691435;

    uint256 constant IC19x = 13731439507080021495215595857175269055764927612142850684078801622411342275350;
    uint256 constant IC19y = 19085879932964958674918865953232234377473750799460607959620845505827980217557;

    uint256 constant IC20x = 8793709658593232701114904582923462042255230746531689399326462538019654025830;
    uint256 constant IC20y = 9989838999668941891429039469156478584536258352030342625130247987149197946833;

    uint256 constant IC21x = 676844696708175103867928084644306821721607317685940578024847691931023536528;
    uint256 constant IC21y = 11885123204508583782566663285179960785847704457876172589471067752544774891960;

    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[21] calldata _pubSignals
    ) public view returns (bool) {
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
