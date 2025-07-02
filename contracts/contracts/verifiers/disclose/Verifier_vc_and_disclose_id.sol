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
    uint256 constant alphax = 16428432848801857252194528405604668803277877773566238944394625302971855135431;
    uint256 constant alphay = 16846502678714586896801519656441059708016666274385668027902869494772365009666;
    uint256 constant betax1 = 3182164110458002340215786955198810119980427837186618912744689678939861918171;
    uint256 constant betax2 = 16348171800823588416173124589066524623406261996681292662100840445103873053252;
    uint256 constant betay1 = 4920802715848186258981584729175884379674325733638798907835771393452862684714;
    uint256 constant betay2 = 19687132236965066906216944365591810874384658708175106803089633851114028275753;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 18101353739435763583590109265110793715384414747647041946588945262712539762455;
    uint256 constant deltax2 = 18140067426412244320277829063813054858080687280648458473373333737751084553574;
    uint256 constant deltay1 = 12100583937504701276222912703016580653535981028073960895687849861510607959790;
    uint256 constant deltay2 = 15548750702110684372424236883290507077807106197064669968534467455581942483787;

    uint256 constant IC0x = 19296243113452192424924855933310697996822768538948987613326131801074651999490;
    uint256 constant IC0y = 16771331152147825421723855311935089253485924413230282229849393808710818180827;

    uint256 constant IC1x = 3653595283879325630602479535989458991160097061510070728166156259221962074187;
    uint256 constant IC1y = 10790371381373660294141465198779172490985130920747984818722525665122076190000;

    uint256 constant IC2x = 2931995820745069612683985494113971152622087465000319255950328786395435877093;
    uint256 constant IC2y = 9035944498664226606544286164575756066313390474272896327299084941139202515370;

    uint256 constant IC3x = 19010813103852088139798709832239279855790983757833527758700283802157404140503;
    uint256 constant IC3y = 14008150425033364435320453632309224439417752598349034283075220373237163033926;

    uint256 constant IC4x = 6464359427916782396404681423925138405662338444504458805039588445789447826724;
    uint256 constant IC4y = 5585341935263792863088946484145858730139922354691100975034188575464035021389;

    uint256 constant IC5x = 16264441302193298499043740097364654859751453382241589793410301994926243309771;
    uint256 constant IC5y = 19345900825912255640810072072146945409110534123970248227352776819088110853912;

    uint256 constant IC6x = 16506208098897464444990121675692030098776720539494167369199350253772929517864;
    uint256 constant IC6y = 5747938518974307274998934485639632806343833887133816517015710818981126395004;

    uint256 constant IC7x = 2238681638455471055829578822399127720012595667722656096829214064981745670869;
    uint256 constant IC7y = 15764057702299002520178408967012502598351293871423340203313391972878844796961;

    uint256 constant IC8x = 15932395283201177466442402942415301957898109931013192561782982972852241691721;
    uint256 constant IC8y = 2081729349237280396718318832990678238019489184626940260804732888455547174399;

    uint256 constant IC9x = 17246464275470462932021159163262315320127213201972267468737112319074389329731;
    uint256 constant IC9y = 13509368513338941479204957377881720321823690944655664118221707796204864855279;

    uint256 constant IC10x = 3529976987798952083700509403394048201827505711672900780512866839528720602180;
    uint256 constant IC10y = 1175068381227513628750176437001431671552694557874397757299109061361439337883;

    uint256 constant IC11x = 11744132562080022492567472652424099627828345514305579053801999033593090208854;
    uint256 constant IC11y = 17163824415869121360389506887612363794446528617703212852652455519927630378243;

    uint256 constant IC12x = 10512569210323709103965694190194535925579460061173603554047811832253237064445;
    uint256 constant IC12y = 9133235164595701016006773136643818513149952700317402791175651663293047907200;

    uint256 constant IC13x = 14096670940648536823284106261043909074114582425994949795940951761080669567383;
    uint256 constant IC13y = 6672936920865870182352778579130923522764995592621615001422332702440354904815;

    uint256 constant IC14x = 10137965082386312343998582217112957990397750154401448195043210996745980297476;
    uint256 constant IC14y = 20665965268686388745453347902051675012719790040992548915780862070073525648412;

    uint256 constant IC15x = 12530722223497031400834132734220149467627216717351170844802409015432675184062;
    uint256 constant IC15y = 16542446169192185598257895867773852412790638192773724178160496977232117853898;

    uint256 constant IC16x = 2935901644122525929795935496871810371309055504379577164301779676669272761627;
    uint256 constant IC16y = 11495678697136282463089051158589610488213413237729871619083312878306933119756;

    uint256 constant IC17x = 3140949415903027147250907133247775515188280246682612979954129543260668993464;
    uint256 constant IC17y = 17780575339356448921747528866474435904948144354613637774978360642667726811957;

    uint256 constant IC18x = 17210861851078129942094207819592580654327666889667849825672227467180086498803;
    uint256 constant IC18y = 4180787430581876644886868782171571145851434462737551567878987473785192088700;

    uint256 constant IC19x = 4013588777574347336950306556469442657948458670943087732631762954689065422478;
    uint256 constant IC19y = 19548932405358697357691307401022714177949934727272276392590540755844899119422;

    uint256 constant IC20x = 14488298009270040796731390116992032453038332814234613353070613811711837220667;
    uint256 constant IC20y = 12994202636175510836807126291634980693356658097859608809378904384302651539915;

    uint256 constant IC21x = 2264174571187610073725254809697046066316081283567712483614790422206657895224;
    uint256 constant IC21y = 5443261565731924397842118569205602979933884113538592419591524392404451555280;

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
