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

contract Verifier_vc_and_disclose_aadhaar {
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
    uint256 constant deltax1 = 5975653288659314559173630546502289092915276110183298941132665434033184687659;
    uint256 constant deltax2 = 11932065747045745104975629046405083109064200133089076374778183349761377636122;
    uint256 constant deltay1 = 21200291998180703391786627268537370639754717050947726480905414956819686196;
    uint256 constant deltay2 = 7519842097234401025937885745438092051835648987642577523832118985185758925126;

    uint256 constant IC0x = 14161725605759523184338252532854378215126906936522047246409168349398011687727;
    uint256 constant IC0y = 837917632681386925505978944501387627840637758492308489030033860784097271127;

    uint256 constant IC1x = 12347231845136841252198959408344579760953930762776335472012558642912341654334;
    uint256 constant IC1y = 19171139513483996967580448230875620188319909700897784512375502296048645527443;

    uint256 constant IC2x = 14067875738684094281944053855575735897012083426203972726159225916232749549457;
    uint256 constant IC2y = 2275845745214734226382422221382946829943859650806170719984749746499419122646;

    uint256 constant IC3x = 13144337137521117862571448171413692953272269454891820105935278326824551706366;
    uint256 constant IC3y = 262118186113269485190756037777167410239882745258249323793003449268654417508;

    uint256 constant IC4x = 12204744666289903951526868110974232682643232552903218195746966666670285159231;
    uint256 constant IC4y = 8333271752763069437085559853880223771975634232782370100773485883838952236719;

    uint256 constant IC5x = 13337044066374677055615684697251703142670814227997788768876947133048172678335;
    uint256 constant IC5y = 14836301376817803130178536497684104286777025733292005093458227271524268164452;

    uint256 constant IC6x = 12430971709296092138291690094676884214033956103347116825392698594405115184176;
    uint256 constant IC6y = 4600285853814761707915038121892575475811925195020643067895488126442304972796;

    uint256 constant IC7x = 21835898288438000815056860809797197454945453685671865888659632245036021081862;
    uint256 constant IC7y = 9581511208792791592979755505681613301656918110392711020043989622993405494558;

    uint256 constant IC8x = 805048910055413108327316148251287711567012227448270270603250182464903000242;
    uint256 constant IC8y = 20074388568656682098432209969459017015605463657904728602885213084046977163305;

    uint256 constant IC9x = 16603785429889707164696562579480343919608269697205974338602411546257931980657;
    uint256 constant IC9y = 2525282044694247624372015399155813089691685312939808682970970552732990267575;

    uint256 constant IC10x = 21726809186654514046952701573776111688759687935855648238033143799314666127357;
    uint256 constant IC10y = 4421175777305836974862127954629146480579634535616690255252116048035769400704;

    uint256 constant IC11x = 7902686895423588535160755489164237816127687765689748043429686960747514583725;
    uint256 constant IC11y = 15061872182123925908418035840832020702482627478746432814295888447105500891543;

    uint256 constant IC12x = 15962004717152841646896468179118617364748031797831561293388300015605373353670;
    uint256 constant IC12y = 14891103606452632568227506711859087518728225440432109964732888022737022937040;

    uint256 constant IC13x = 3632514804452650009630346876088907842909009567747380771589073025451219233531;
    uint256 constant IC13y = 6410817454552082880367361294399397706087271589838821710119906822444215429260;

    uint256 constant IC14x = 7783626269188411391019409614602541568639684005144846483698219167865789854866;
    uint256 constant IC14y = 5515347137991370993755350181574701633769722098126338618325345482717941539097;

    uint256 constant IC15x = 21340638595467523972715551097538060415231675418665135934122577583589799345284;
    uint256 constant IC15y = 6711902293140999424944529553034720017045491076338579799330069153343751805291;

    uint256 constant IC16x = 20493149719068229244879507809911942603120475200216593650840212396018823777267;
    uint256 constant IC16y = 7301667689402372735905828428111586010034839295668745301104045091666812804411;

    uint256 constant IC17x = 13420106429953696018789010648266870737006484386783872331167574526625395352254;
    uint256 constant IC17y = 20794037500887742095696051789165620698467473232217129126628967017579782320297;

    uint256 constant IC18x = 12607927365422734904661901421400763601004026940711232636963643829561190773684;
    uint256 constant IC18y = 8703962251906561389135627251159668903419340382875686740777574778695814605108;

    uint256 constant IC19x = 4949904196754768205196891357571671844458029197189818649914332420920937394735;
    uint256 constant IC19y = 11973737628254663948504990512778609112229260714375161069097590912391033950290;

    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[19] calldata _pubSignals
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

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
            return(0, 0x20)
        }
    }
}
