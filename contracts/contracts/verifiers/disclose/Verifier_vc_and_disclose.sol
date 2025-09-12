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
    uint256 constant deltax1 = 16003296527668925742863515818275579351356339601946180391890101479883479175048;
    uint256 constant deltax2 = 19984896270701531499196389858214296071784225307233905736778009760168662407770;
    uint256 constant deltay1 = 5138655595787089892482835352178966166781128102524280116487962013964720103607;
    uint256 constant deltay2 = 1217532993718676692158820192374740421387705198527773729064132560667312540512;

    uint256 constant IC0x = 5596963095588548215463373338908863751044901017738158737470568961739673965961;
    uint256 constant IC0y = 197014595429711666232705760798810381313943401644903632013191386416875480347;

    uint256 constant IC1x = 5205997661858310131019668271478592188796010857087211482717528768703330586157;
    uint256 constant IC1y = 13176893502345648015788198894995265386937497795228160152334741440356148760775;

    uint256 constant IC2x = 18686575958474802319284536716008271197119798202369722729545536852821555672502;
    uint256 constant IC2y = 3215233739805959113477947017922133477171290691316010120728592048201282926316;

    uint256 constant IC3x = 1055127295460550191570931643553037666433550808218997758502836878984684391612;
    uint256 constant IC3y = 6635530946691458473442812686202910426342274602603661196235658534469306652670;

    uint256 constant IC4x = 1176481886486243698849395799015692190365205425437354380942590868210339561547;
    uint256 constant IC4y = 11032707277468575718219050081069609294195714593272361592511167680044356246676;

    uint256 constant IC5x = 21472746513384679694076117414900521235398567169230511281372877399956105858021;
    uint256 constant IC5y = 563092790680798493082477969374982298318954854173051786179456245393201893102;

    uint256 constant IC6x = 13601138852852403856005944646975090972729648614966676409231172122638333974547;
    uint256 constant IC6y = 3581105645906785730892656040994982459922202487976234152960491483044370048575;

    uint256 constant IC7x = 6157557994850342948856683835911743140429039440220926429072418330957123608019;
    uint256 constant IC7y = 17388180375008418233457359417526833014165004918527650588909336131820427902612;

    uint256 constant IC8x = 19544790484484484983818685444502423855480935224872533613761747434233145297100;
    uint256 constant IC8y = 3086922147265903956378031708647679668364443698616954000627119704330804346839;

    uint256 constant IC9x = 4095001260637928303635953754907841429905765318689568133295242708426356192097;
    uint256 constant IC9y = 11201866687354690165969898890054530758881524395050433723353485108691384430582;

    uint256 constant IC10x = 19897122716138572934585433218242234674962957249341493237507498893019713486242;
    uint256 constant IC10y = 21689091687047727664119058388835593061120184946270862215018621609047615882056;

    uint256 constant IC11x = 5478252900725318753860283254407973861234833745169084257513502840647894550060;
    uint256 constant IC11y = 1791296742307044584126205288560498393897750881136190887025323159136398403555;

    uint256 constant IC12x = 14795507180423659678567208590170058380783028172120947205106407450365097532473;
    uint256 constant IC12y = 10820601127512798821002861433402355623851630698577616863236044291614160298924;

    uint256 constant IC13x = 1371307947996742453808445358832377756162415203013759111969902645610915102884;
    uint256 constant IC13y = 10979064264407256506966027217833361504889104814732489559103793054688600335381;

    uint256 constant IC14x = 109788638163029769699092214797728443378801928834723847442030420151550653348;
    uint256 constant IC14y = 21855764518074664201856214595345297576098255265106979512083523259607952247044;

    uint256 constant IC15x = 3483239985558231052997982184949030327610541095960983024278219968128420996301;
    uint256 constant IC15y = 14733921718987244788451642956589707498178006322890807039293135360881648657799;

    uint256 constant IC16x = 14798732842280992927477761391955163343018141761671851666429268509498613724692;
    uint256 constant IC16y = 4455056645878601140444148446204168238779052860658115931655024263695173929532;

    uint256 constant IC17x = 7736826968011671338791057639700188385088653935654554560239035205278727242893;
    uint256 constant IC17y = 500124354635552411023163921908192899897578217026396431383560884442758389341;

    uint256 constant IC18x = 14998100555567060664437417744560818779123122162052297806706232682724037825765;
    uint256 constant IC18y = 21042787205915057944739845375687838358031355418400790550766487427122410219370;

    uint256 constant IC19x = 16820751365714164024735961591109709928906102027280708691045408574326309130538;
    uint256 constant IC19y = 13969803504492496345541664178863570638687274552579034460891887717501487588820;

    uint256 constant IC20x = 6300931722409788047719158584043307098783826800509826930873450623429686354711;
    uint256 constant IC20y = 3296077608321280418003957840869174287982028175759219453107764250219772326699;

    uint256 constant IC21x = 8575934641343546340479763260628203666392881516995856567983301829732041115320;
    uint256 constant IC21y = 9883873130137129757933294169163215566229691629254682468566589714083960043129;

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
