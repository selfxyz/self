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

contract Verifier_gcp_jwt {
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
    uint256 constant deltax1 = 1251881756337791411928133847605135151052521532650145608856023618834663237249;
    uint256 constant deltax2 = 5281789764009987450775605587672163080892994094738055552649386387568551504938;
    uint256 constant deltay1 = 10977469751764298292601658816468903002676551535082393684254221834632855537611;
    uint256 constant deltay2 = 16316330863572428734364637140327331781488799597244767274686281923936865378112;

    uint256 constant IC0x = 6972951741762339913362267428319005943611938060812676091174501911982947323821;
    uint256 constant IC0y = 4968121098705797351946375443564156998686441710551907423285338106315203657372;

    uint256 constant IC1x = 3969479803545901558882616933276060341612655312403217371718193775571328202698;
    uint256 constant IC1y = 10796516354190443333590906104065573186594421836191093099894208495600273943382;

    uint256 constant IC2x = 5282886783908067346990928387588210996099802199800176473402519317523182497411;
    uint256 constant IC2y = 13420701105707643769706876856296866111708803407614711871170325095961081369695;

    uint256 constant IC3x = 14105950545034420261862110084277090993607573654064743638564927148396262651666;
    uint256 constant IC3y = 13354956139782865997977495342720245140716772080136555810660173122394181127180;

    uint256 constant IC4x = 17223368406124250621460330134418760536341963146179581332507963390797809647912;
    uint256 constant IC4y = 19015620010364835231555497011683709184643217460850880718542989960325995808017;

    uint256 constant IC5x = 11415362657438949221591074018468802007898322076011964898865456054649179831908;
    uint256 constant IC5y = 17459573325598515038912928408360066384367356809087828399079121874232360528478;

    uint256 constant IC6x = 15574545936483334745596750909280550198515448424427848182054643607937078179213;
    uint256 constant IC6y = 13006549512473282147197122913454973085866920937923147249375738521329287066222;

    uint256 constant IC7x = 14645989050046479540147134517500433000682841795623944679511623689017979403245;
    uint256 constant IC7y = 16002146776744341769994596125501558460157837756621333957158039132600774201665;

    uint256 constant IC8x = 17447612904927318100653430764709204605475101707883725218472729377143326600248;
    uint256 constant IC8y = 16892886274335002504909275077153679691684214526248560805118560019125943648821;

    uint256 constant IC9x = 17653661950237194880278154054792568909474176263902202958186273149474358670533;
    uint256 constant IC9y = 11669219494719975955790450067861506164332870357879984076098486608481987018857;

    uint256 constant IC10x = 13289207501149959620194929372715676920560830325500657282490914929267428690980;
    uint256 constant IC10y = 12465657438099014694334055521610703216229866770917539818266695642349007426072;

    uint256 constant IC11x = 18446654622136293276199162514838693836980616816456314636743905193625590745253;
    uint256 constant IC11y = 12876916821064374752505779861869326377989533450827838519593872009453598320656;

    uint256 constant IC12x = 11001381773587677694421240176598022327285567125732057704900785068521955604564;
    uint256 constant IC12y = 15721905323957520285870204323317542530315127175554829712351392669354944626115;

    uint256 constant IC13x = 19526090904722047042773905186611760547729403485756211734248157863388135796357;
    uint256 constant IC13y = 6872421404352779784414693997079152972445035104903743503355279949152744176183;

    uint256 constant IC14x = 15194138441068760983236111544251338084740306295420897247383092303969333517280;
    uint256 constant IC14y = 17571382599242644993857901274570230804168370452582601899367177574780143361956;

    uint256 constant IC15x = 584870595147362727880838486101127854955042037369856345600359023707849233383;
    uint256 constant IC15y = 12343643073139461156226272211050331809098122200356986708169739203244290558425;

    uint256 constant IC16x = 14164891277783985284859197223195840777194061449283527719178608169082529731883;
    uint256 constant IC16y = 5769361895392815047832493230313789373949187154386769492255962435984388734;

    uint256 constant IC17x = 5526583431755874525920531779957581117218605045719526246142282984128225259812;
    uint256 constant IC17y = 15582261976988135470726322969910254124942972597198825965150134549937865280024;

    uint256 constant IC18x = 11933687532433713666089789805193821666211611847890385200532102102696090562695;
    uint256 constant IC18y = 13768581020150988368938923899239734752213497676691170616636813895788587803927;

    uint256 constant IC19x = 21039243000302785560612608554208434709650210545299036143304628975668975303432;
    uint256 constant IC19y = 3072044020424624557872621541718589400992098528118783904368755425332969903054;

    uint256 constant IC20x = 13029408846315391045768292892963336300734709802776968717851605403617397448869;
    uint256 constant IC20y = 21441391199269244274037661931659719640029973634066921385003370500690694569608;

    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[20] calldata _pubSignals
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

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
            return(0, 0x20)
        }
    }
}
