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
    uint256 constant deltax1 = 14324652197233524730641128864453952705287261438027941215119848149313687821891;
    uint256 constant deltax2 = 21484419249698297517228580410359777419164148894816781833836153164365935289751;
    uint256 constant deltay1 = 16582639760164029271670474683933633491275197367453348914396759452543655643766;
    uint256 constant deltay2 = 403364129427239992507797759205273357623430219990520056171053424359490948488;

    uint256 constant IC0x = 5807421164254058694768562974091556471982618906409701089817378417825836236343;
    uint256 constant IC0y = 4762128381603790376888559194340882557264389099298755687176588554202025724461;

    uint256 constant IC1x = 16662390513821057352794413094488187612031938804807079860864108802496451001816;
    uint256 constant IC1y = 10297510270592678540657167982591525863128041683855232684458106298771022792321;

    uint256 constant IC2x = 7653025634029084987308170086828490275298599740834466183953126955197487414356;
    uint256 constant IC2y = 19645385561052696065344838011986430522165661506559202243279342170061964546655;

    uint256 constant IC3x = 10511361376569345195406025469041361191651442241768535575261966054173983787397;
    uint256 constant IC3y = 4753267144655208758494954970965128596785915703954332029494912918157374545900;

    uint256 constant IC4x = 17891598869612007035497347537395151468322232625646857061035566440141799353157;
    uint256 constant IC4y = 7327472162072976666976779150327124950314720612127324807495386441616338368867;

    uint256 constant IC5x = 19379848679264073687952185691016095700021268381890295930462472788745053969888;
    uint256 constant IC5y = 19164887608566056729336084782278913102562387728008861526609638975081522984209;

    uint256 constant IC6x = 9052597422036659198765116771520013601665763509526356714069889986137129899304;
    uint256 constant IC6y = 17053984243050986442970381835166298254892607442877935692807165714510713974133;

    uint256 constant IC7x = 21406785126691449735393464427941713640943869278510912368181929030568455096470;
    uint256 constant IC7y = 15441344638363214564807483754052042320000169836576212379606121941073936072663;

    uint256 constant IC8x = 14584635132883462229965362975544665981679994676845588706509348488004715407495;
    uint256 constant IC8y = 11601978078524726660737255096987791198409734787446205351625590575308497682341;

    uint256 constant IC9x = 18566856048382194815211582775829521113999452702204011689044527664589036829978;
    uint256 constant IC9y = 17564093409732961661054461664967275243454991970738432665314639276201066462465;

    uint256 constant IC10x = 17578362792503922684070912668973950103584970370029615225140277040265536490684;
    uint256 constant IC10y = 10072295905096503524936898194115490761143012925095648887710751149646091643044;

    uint256 constant IC11x = 11176021192691907097978774092559748731443899751874219959618393028316694443072;
    uint256 constant IC11y = 7376036693105311360497433586682614583706378369978487440906932493233217037539;

    uint256 constant IC12x = 10327879881961641314568906321975805490180725947535905985095559856477223460641;
    uint256 constant IC12y = 3098196555307154489632503773862098128291153650586044744663532040499786471251;

    uint256 constant IC13x = 6604007520188320681700111646215276820846531399504948949112735036053740363763;
    uint256 constant IC13y = 20391884831916732655879418660804444124587580108833621419350459984544674397658;

    uint256 constant IC14x = 10573613170402755166663648598802974723655481690861311162091782780643794707507;
    uint256 constant IC14y = 12641603056766073029280139827316177764406532047489910983005142005327582366856;

    uint256 constant IC15x = 8032993249763900729871190151880778566348652063810342826940009101155352989062;
    uint256 constant IC15y = 21092275273423767728713685573433195066391399247575619321586800017516422017524;

    uint256 constant IC16x = 6949369268030204146033557816152242151237750687177559659981302010033063636735;
    uint256 constant IC16y = 13024090575871988182743358095945594665255237391858718878203452318841792125483;

    uint256 constant IC17x = 5696684074576718041337457228655364625810514470086764663343119291679037645981;
    uint256 constant IC17y = 20782688080692471786852240869791733265079471721127845164762298880982848762711;

    uint256 constant IC18x = 21493203180510390741347724896623560565563787646721333148184026110374233207598;
    uint256 constant IC18y = 19968375627992694416627843492698194729194287566868443998824242244337241469789;

    uint256 constant IC19x = 5512336834611608721293525306829636603018046531962622983181968606257550005946;
    uint256 constant IC19y = 6009208085892191402468411187136512666153490634646230065964932723210132847100;

    uint256 constant IC20x = 11460461063342597043144253617111356597266764770233533950860040127208500820081;
    uint256 constant IC20y = 19190306512992109897447125075053164890623026446048588795322662152517679283770;

    uint256 constant IC21x = 1327828313007429340545265368612436322983926232135317070796976852822355973929;
    uint256 constant IC21y = 21048374296412833003371198781842749103037353560994844402966733372765619158064;

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
