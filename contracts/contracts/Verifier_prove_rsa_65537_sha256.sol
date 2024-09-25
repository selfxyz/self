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

contract Verifier_prove_rsa_65537_sha256 {
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
    uint256 constant deltax1 = 20376714279900201022033197169022920178897901417582052036643101062215386773426;
    uint256 constant deltax2 = 9442535840620533107637564400945630873943077753499805469509198993255666379206;
    uint256 constant deltay1 = 19412845060421255560104956226982748000156098599368068497694197650721070744922;
    uint256 constant deltay2 = 11648338734754469276756128394055756086392668315733295767436597360997778259006;

    
    uint256 constant IC0x = 7595403196570614620858053627218173528593866247444307469911972796255811939508;
    uint256 constant IC0y = 6481819278993045777690428747916169037499491747325270051258480198431017347162;
    
    uint256 constant IC1x = 1894020315594978860776999492343737552195437461498667915150232512805710005090;
    uint256 constant IC1y = 3344624160110804811954846130900029091123646923947891147287073541405264854448;
    
    uint256 constant IC2x = 2085732774554901330242897585052775741881702531682987715940264048743528477687;
    uint256 constant IC2y = 6154996770733784023194150389050051761539243988134306766898886742370968446051;
    
    uint256 constant IC3x = 6954818044755524481512227930127237119133532766846801693332937530610299391460;
    uint256 constant IC3y = 9982472408109826215615533191397986901885495314532244470226706379540249661646;
    
    uint256 constant IC4x = 16346081600242185256977962860176436584985760362854369976329293039737638623113;
    uint256 constant IC4y = 3642869131523505193831128569804477327356374270722251885786753553929477449850;
    
    uint256 constant IC5x = 19722039786188002009839997791329924744592905691896685321187202593945006428742;
    uint256 constant IC5y = 20922734670196679923384821052120486816940119678407287860431476885573303604160;
    
    uint256 constant IC6x = 7946966791967989992962125377915814825532351774832541574017744340525291609802;
    uint256 constant IC6y = 18730414723296562251027547771378072305165578203810223460053153146330002249884;
    
    uint256 constant IC7x = 11052235504749397839523261332461028094483838147104517342586961217695142606392;
    uint256 constant IC7y = 17823668979969465877147105114140331026778384890235335083160709851071544094046;
    
    uint256 constant IC8x = 14168590488938855780415223242625163432929149577552604012422609859669559591613;
    uint256 constant IC8y = 14574707474912505105022504970781187965007996274987152033627017387616924288020;
    
    uint256 constant IC9x = 14112002069527030112871590992530809099012865094710794022621456648082622248378;
    uint256 constant IC9y = 13674806571765444217191383573245922512068289844307611007156506543396105168208;
    
    uint256 constant IC10x = 21374140387248143639717851982542659929332617040290064511265744602668176714476;
    uint256 constant IC10y = 12998562489009892047399340272944451287515072275261769536965982553488615307514;
    
    uint256 constant IC11x = 7673322912643170774332725514962362094027167619469035981990080857375939329848;
    uint256 constant IC11y = 6982354379015794696953299873200066362625210425928617663481924918281629822773;
    
    uint256 constant IC12x = 17091297446835939295715908244106562446537374167230386915228317564722456306491;
    uint256 constant IC12y = 15734260355482975078681305925306166781010147117539087047915197525711830433177;
    
    uint256 constant IC13x = 13661831405161710813904784154600319736190813806275778789075386803699000616209;
    uint256 constant IC13y = 9426469671343957059156207776676542333331058151927063912400924331731285918822;
    
    uint256 constant IC14x = 19774098011166893898014900863624785093218449187713559968469409328752911474774;
    uint256 constant IC14y = 9297454614987191621825215267087144076573871542395299057058366131858171375745;
    
    uint256 constant IC15x = 10447256158067575518409575550937809261045356886936253762318735767892476188135;
    uint256 constant IC15y = 4224122974110236367150849025356938859223997779900504035373605596028622415239;
    
    uint256 constant IC16x = 8449189478041210982798859110621721552831925078901213535249812205465260987858;
    uint256 constant IC16y = 15253373845479511313291578022398725451879208817242632992645852451680272221233;
    
    uint256 constant IC17x = 21105814116883108265254479606600909593392351683049589087449340953263307770487;
    uint256 constant IC17y = 12201255040274227468331475452408201369459897178730869530729522913117394925373;
    
    uint256 constant IC18x = 10072729100243412181913456855299293321264787146918489911412971836092419281808;
    uint256 constant IC18y = 17111339827491937932987233318699811350260471082191118594613655649829823549205;
    
    uint256 constant IC19x = 9335542922737689829277773998277286957439019583592319228191210169588440056550;
    uint256 constant IC19y = 13892111372873484967082933316182680807567059840962667740917923410109376974041;
    
    uint256 constant IC20x = 2845973375889591933866992201658922333693528466518142757952906308453300334591;
    uint256 constant IC20y = 16755684287992631575760030176152079889168610738238788059575276092671653575801;
    
    uint256 constant IC21x = 5052834273751879261054089324144862300406534101860562973958428841957772139726;
    uint256 constant IC21y = 11693145254325886657091168027913891436900757114887755318144736202549302479901;
    
    uint256 constant IC22x = 13070289663494638666013797993526434983121790451346359096503421277643260001673;
    uint256 constant IC22y = 6801224257193709710646043107550204845049915593291052159150004748783691293088;
    
    uint256 constant IC23x = 11255058095879864901486760592099017787454769629818521944302160432659869166434;
    uint256 constant IC23y = 4629443469813918421784615516759056778917885548950830891789878219046503344390;
    
    uint256 constant IC24x = 1978781306674321796238054354893590772428966491483325956271576000303032878402;
    uint256 constant IC24y = 15837865279491249749056354140484321750086502115767305033995867361684824689165;
    
    uint256 constant IC25x = 12943087031120932057307864826006372656279347308904320190568395726243759412708;
    uint256 constant IC25y = 2760688633282105910898415879973105647317085527689115702799134198832097296336;
    
    uint256 constant IC26x = 21444089604732566365659873747783402134391509147515280179599004487152676600247;
    uint256 constant IC26y = 7547374938723251144701628501091586578315514113343868631485894187946002156552;
    
    uint256 constant IC27x = 684236092051960164619795024087488364528038211256024240712020865698464449315;
    uint256 constant IC27y = 13177373563939963896855271110993804621439186814115372767446790290234868193677;
    
    uint256 constant IC28x = 21083879925891636227791379526120581471263520642187500812174612374072416047748;
    uint256 constant IC28y = 19077436174596535085067575230789920684050277916743961533975705837326983973902;
    
    uint256 constant IC29x = 9657631759001048623180066391270186745020151335813077295677189916823705618081;
    uint256 constant IC29y = 6836781349113625798598927449000610992531730704751981720732174318168135148787;
    
    uint256 constant IC30x = 6730001626952648449596987116849498652799207988223932390250526461316652372359;
    uint256 constant IC30y = 15528121398813829002828731934182269324120676234940512624164231892189304016552;
    
    uint256 constant IC31x = 11454415026323246178914876895513749420416870643582564817062992889184156564645;
    uint256 constant IC31y = 9773255886232640031568618858848677889755264032505350174184170635677146246892;
    
    uint256 constant IC32x = 17422189945768598284072509406615881105553976026170031772858421201096983521265;
    uint256 constant IC32y = 20865072375957840506541851551714535780174822685411876338920533153424869669672;
    
    uint256 constant IC33x = 13722410491841883362319705725342093318006870707347100101286637163176427298151;
    uint256 constant IC33y = 15748126542272798357635027628544603481056163198418567927237181865107664171250;
    
    uint256 constant IC34x = 16468565540670562680415128686084178194512245306843919563457221977852565085987;
    uint256 constant IC34y = 8225955074205237275121825593807176608387363712109714983326518021181573539473;
    
    uint256 constant IC35x = 1640775851589768376107134873751892030661408889379866824377752038740955429472;
    uint256 constant IC35y = 6161160978946292453874036243094015011487455662687392169900447565545080057342;
    
    uint256 constant IC36x = 16346805895920132908519631447181800142250175892629092290489965392674392512589;
    uint256 constant IC36y = 12421382346197050411367717598057209126603974174253351326576521570381327498363;
    
    uint256 constant IC37x = 6945081463391865406224109851459112337089628652476214250865703213368668941323;
    uint256 constant IC37y = 5529100574918197115319187358927674944512872339879730078627690876227457105947;
    
    uint256 constant IC38x = 5994236439821243382760865834346908733170341806168656166872456084324149655143;
    uint256 constant IC38y = 5285616596348493787011961507167200220733928190086103977092122247965848391142;
    
    uint256 constant IC39x = 16764182720810380456676325601273283848007353112174054661088639373315975605615;
    uint256 constant IC39y = 14940268758713185581042705857364642310841259569652735531102291003380507991112;
    
    uint256 constant IC40x = 175292997105848072745559912101775093473728056483912700921158238535496575156;
    uint256 constant IC40y = 15835943259616115873404413752403168689382148153199516375752595322005734874248;
    
    uint256 constant IC41x = 420437228315846005061519687771312861335290593218752915763918031455873461506;
    uint256 constant IC41y = 12587448852815382590187609591150667513323960466151646670533430564747819841468;
    
    uint256 constant IC42x = 8303884951716507775432830778960464776137354685355841578923871604997569150004;
    uint256 constant IC42y = 17180053471748781141586695737390058412171746077234998364769249735200965185317;
    
    uint256 constant IC43x = 13325463367938168279157935971350679264610298624513053404321791912876681947025;
    uint256 constant IC43y = 9772431535743604634314919091831864799500807466126142962781656217656484225179;
    
    uint256 constant IC44x = 15543110211966883158064062210371299758116633579757957858191844733272237109904;
    uint256 constant IC44y = 4001121022702646086120512486216275177456845249932905571316345156523439618471;
    
    uint256 constant IC45x = 20544517678913036125979171403031826179091782110978373925966921806485519526803;
    uint256 constant IC45y = 14550106184672147266397485152946912256320512132141586561270561391505320388627;
    
    uint256 constant IC46x = 21764550622315058094106697243869366708149011023442703109784652337803438447721;
    uint256 constant IC46y = 6963719187011682053791283378286147435580038889532194480312439560629024627618;
    
    uint256 constant IC47x = 19581888935359283330824522601536139319584317534674425691165789755317644183412;
    uint256 constant IC47y = 3248476514158917948786910815495321689743378179829148420138424172819571453557;
    
    uint256 constant IC48x = 11326150969552093519155464726715152920635488260352326370456121043433520797511;
    uint256 constant IC48y = 6868366405486516383171301857849014887926150695927639418682212134054324776533;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[48] calldata _pubSignals) public view returns (bool) {
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
                
                g1_mulAccC(_pVk, IC29x, IC29y, calldataload(add(pubSignals, 896)))
                
                g1_mulAccC(_pVk, IC30x, IC30y, calldataload(add(pubSignals, 928)))
                
                g1_mulAccC(_pVk, IC31x, IC31y, calldataload(add(pubSignals, 960)))
                
                g1_mulAccC(_pVk, IC32x, IC32y, calldataload(add(pubSignals, 992)))
                
                g1_mulAccC(_pVk, IC33x, IC33y, calldataload(add(pubSignals, 1024)))
                
                g1_mulAccC(_pVk, IC34x, IC34y, calldataload(add(pubSignals, 1056)))
                
                g1_mulAccC(_pVk, IC35x, IC35y, calldataload(add(pubSignals, 1088)))
                
                g1_mulAccC(_pVk, IC36x, IC36y, calldataload(add(pubSignals, 1120)))
                
                g1_mulAccC(_pVk, IC37x, IC37y, calldataload(add(pubSignals, 1152)))
                
                g1_mulAccC(_pVk, IC38x, IC38y, calldataload(add(pubSignals, 1184)))
                
                g1_mulAccC(_pVk, IC39x, IC39y, calldataload(add(pubSignals, 1216)))
                
                g1_mulAccC(_pVk, IC40x, IC40y, calldataload(add(pubSignals, 1248)))
                
                g1_mulAccC(_pVk, IC41x, IC41y, calldataload(add(pubSignals, 1280)))
                
                g1_mulAccC(_pVk, IC42x, IC42y, calldataload(add(pubSignals, 1312)))
                
                g1_mulAccC(_pVk, IC43x, IC43y, calldataload(add(pubSignals, 1344)))
                
                g1_mulAccC(_pVk, IC44x, IC44y, calldataload(add(pubSignals, 1376)))
                
                g1_mulAccC(_pVk, IC45x, IC45y, calldataload(add(pubSignals, 1408)))
                
                g1_mulAccC(_pVk, IC46x, IC46y, calldataload(add(pubSignals, 1440)))
                
                g1_mulAccC(_pVk, IC47x, IC47y, calldataload(add(pubSignals, 1472)))
                
                g1_mulAccC(_pVk, IC48x, IC48y, calldataload(add(pubSignals, 1504)))
                

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
            
            checkField(calldataload(add(_pubSignals, 928)))
            
            checkField(calldataload(add(_pubSignals, 960)))
            
            checkField(calldataload(add(_pubSignals, 992)))
            
            checkField(calldataload(add(_pubSignals, 1024)))
            
            checkField(calldataload(add(_pubSignals, 1056)))
            
            checkField(calldataload(add(_pubSignals, 1088)))
            
            checkField(calldataload(add(_pubSignals, 1120)))
            
            checkField(calldataload(add(_pubSignals, 1152)))
            
            checkField(calldataload(add(_pubSignals, 1184)))
            
            checkField(calldataload(add(_pubSignals, 1216)))
            
            checkField(calldataload(add(_pubSignals, 1248)))
            
            checkField(calldataload(add(_pubSignals, 1280)))
            
            checkField(calldataload(add(_pubSignals, 1312)))
            
            checkField(calldataload(add(_pubSignals, 1344)))
            
            checkField(calldataload(add(_pubSignals, 1376)))
            
            checkField(calldataload(add(_pubSignals, 1408)))
            
            checkField(calldataload(add(_pubSignals, 1440)))
            
            checkField(calldataload(add(_pubSignals, 1472)))
            
            checkField(calldataload(add(_pubSignals, 1504)))
            
            checkField(calldataload(add(_pubSignals, 1536)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
