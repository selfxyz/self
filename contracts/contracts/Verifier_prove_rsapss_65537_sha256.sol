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

contract Verifier_prove_rsapss_65537_sha256 {
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
    uint256 constant deltax1 = 884066525939690714000819001863600129369391547684124529548796501303851658481;
    uint256 constant deltax2 = 10743775734637074659290100438528843538179339355461200775221709932720865158487;
    uint256 constant deltay1 = 4225532817203250867509634827069083416084439658192376405160117689865860878698;
    uint256 constant deltay2 = 9683041295227284356972989341001181678252458933210383469189868490032868759393;

    
    uint256 constant IC0x = 11338181916381467277690447521474066013772949614632285643581439209070810709563;
    uint256 constant IC0y = 10543223284025945507848625948914239929870307465364079311821105529889957468627;
    
    uint256 constant IC1x = 19176321689370021639714255951825935469669455573175008479746647710432150208973;
    uint256 constant IC1y = 11393073965689139744866314746213872894995228756241570116931813002988711589057;
    
    uint256 constant IC2x = 17881191298297500955336715740789892247229125173002752575555463019831864146560;
    uint256 constant IC2y = 13471959353133784640100337239420619513522619450756902100778219989870551623646;
    
    uint256 constant IC3x = 11014148154851318941345658663348812313257491796143999322598048916986301645329;
    uint256 constant IC3y = 3370156972347362130791745564299158183124423606756566948209685632477083505349;
    
    uint256 constant IC4x = 7800711068698462379143052666894959349945169055988027554121135821832764476813;
    uint256 constant IC4y = 16421671100390774005562193877110440946096492091452503333609237675287703840028;
    
    uint256 constant IC5x = 17482901337578620656957956224327740507166280083992357188834865508074641609384;
    uint256 constant IC5y = 14008685722222981833223106737839764435686930995507901667096483302813969266950;
    
    uint256 constant IC6x = 7370015551566049469460057578018068981710326328289841150831507258465850055999;
    uint256 constant IC6y = 9600662448462317632659404842420358262403314476132258339677247157990353258237;
    
    uint256 constant IC7x = 13256436884602869344188200699438758571458304882925613359382895539473807333161;
    uint256 constant IC7y = 5876102591663868759796541206411738979577519435066615740979732936311923202820;
    
    uint256 constant IC8x = 16299195944157612673734068194946224611297263963215090258055017424831574519012;
    uint256 constant IC8y = 2721788240524533898564505545659769483712765679498652603099297121991724783983;
    
    uint256 constant IC9x = 16597321608494311820675720863274596045922401353868333196097032037659511423795;
    uint256 constant IC9y = 4722360067417380296463300014343684854369920313098988035846358817473366026967;
    
    uint256 constant IC10x = 16541782980879147729922449853686503038884499883854003329957958792374438930169;
    uint256 constant IC10y = 15351585068009232427003804700482341513244984338084323753860739944455730935397;
    
    uint256 constant IC11x = 7585928750391672639425071759304336796892526819936938700048361322337425026000;
    uint256 constant IC11y = 9698581448322554879371943411339567956588414278240755382609428594110109256233;
    
    uint256 constant IC12x = 14621943998230841252161135067803472322959846985895622322153792515363283810291;
    uint256 constant IC12y = 12456906159400129535929273819986508476320734818984505635551818424460832526083;
    
    uint256 constant IC13x = 787270409964251462671982928177341591008274568698190459662299497413814222310;
    uint256 constant IC13y = 3427723697001533851164623130759839142976805463313783391077620010071503162396;
    
    uint256 constant IC14x = 3560060907173102926957290653968239121815766431713113317166764888255134201199;
    uint256 constant IC14y = 20814235792500011585996812784545999557820572208180541159166784539320799188250;
    
    uint256 constant IC15x = 16814786715505700874140586392364169893471078503393162385469061634619038880700;
    uint256 constant IC15y = 15109973333314653887524049370969404987018429592897766166243370936074671234632;
    
    uint256 constant IC16x = 2210385489698923558099134299572135228669345068812953889643751689869901347628;
    uint256 constant IC16y = 4985480373599202233345553721866901150252558971573248482780624656813797986366;
    
    uint256 constant IC17x = 17676941481380313455683331756638337334645548707189718155917642076109460906301;
    uint256 constant IC17y = 15221322212786557101228707652496309660610711713442791060338221033880632302079;
    
    uint256 constant IC18x = 6493864774829714431496444675613152227989005847314358125942127449409602921813;
    uint256 constant IC18y = 14796482666298496011551133872396355471520991304259104006892217808472870539876;
    
    uint256 constant IC19x = 6526969265793677671928220890596193636833410633262615590620365814105718717507;
    uint256 constant IC19y = 19838726990867620750030468756728332686217972076988714837362006110725127994504;
    
    uint256 constant IC20x = 393864725239699712999471559536261045474387749836622181518570795691848587245;
    uint256 constant IC20y = 5723245412912333201122357413953535678033291805618300562172890781926870609034;
    
    uint256 constant IC21x = 16957071383180548081767578239288067358105498631519803555194748806005446861902;
    uint256 constant IC21y = 11328571929603812720737761918908050648221969623637890670226685947398213298984;
    
    uint256 constant IC22x = 3743216460654224912754493991209960580913988094490641471418873370073996454395;
    uint256 constant IC22y = 4369988225272172376131468922367585496805717339438578930749438624257504070788;
    
    uint256 constant IC23x = 21371778028646210432224312815850214552063065617583541602611300385963948763211;
    uint256 constant IC23y = 8539840915753251742815044527757238394463615920417713184276197168594100071285;
    
    uint256 constant IC24x = 19783996920995269240455578186306219177993039942163370766813745455152118191899;
    uint256 constant IC24y = 6585083631703223395679688065361971515697374303203919147723763083567107502760;
    
    uint256 constant IC25x = 21318396593448889627558307702724594008078064603218782261812081531786154341782;
    uint256 constant IC25y = 19919341186528155810812710877301005429092999365634599136927025066430274448996;
    
    uint256 constant IC26x = 19627473181342351437167684016151869840539050033629456236550651912055407221618;
    uint256 constant IC26y = 17682382299456670775141652551233045132613073749433144390960212407785856410096;
    
    uint256 constant IC27x = 17241442802373152755582640827913090145847508647816421524452534278125577404831;
    uint256 constant IC27y = 18468497443729619161106817987266437216772258234154203930392703557188008297340;
    
    uint256 constant IC28x = 2648971887988419114899705222412042708104746648816202641225154917032836115902;
    uint256 constant IC28y = 19772629045909760791085499580673663380080906142557752438706376497854270020355;
    
    uint256 constant IC29x = 6614740642573666423318044442578664027769941650523796800796862915483647057113;
    uint256 constant IC29y = 8560009168464069632109071884454883578495158899965739056768880240006312309281;
    
    uint256 constant IC30x = 1195079766355274115923504310687817680910886599468132482517441753790363386914;
    uint256 constant IC30y = 7801269861366410787496256444587351040909102339816976683967519585910874343597;
    
    uint256 constant IC31x = 21597997273124406415276015346945422465443171215188075685975672149898301198407;
    uint256 constant IC31y = 1166907047070034696048029540098782160402617459991815986682921374923275932774;
    
    uint256 constant IC32x = 13891641232326252125458600246398524904383497526073701796153228516388294906590;
    uint256 constant IC32y = 13321923776334519924159251145511562000143719752514577173658981880331314056416;
    
    uint256 constant IC33x = 4958415244489112026907773499157953599398824875736785495011100583725336836335;
    uint256 constant IC33y = 2628358531005747642077229135120264392437243180188410830392562000671356015489;
    
    uint256 constant IC34x = 19148254610248201929921858794175779262894528921045544785170225163778148230736;
    uint256 constant IC34y = 803554058673652655426033454269176367818002249976056913071926996256867986622;
    
    uint256 constant IC35x = 9789765543602416800203187603403905136021085240170968020139448098773543678691;
    uint256 constant IC35y = 14517636095249831574683361349535009339101278374369760491128446834395377473232;
    
    uint256 constant IC36x = 16887806471538011849477774057920125732939940589871523250207184100485386984379;
    uint256 constant IC36y = 2045200403005849494056335485519383326144258265244884581550687728771098192569;
    
    uint256 constant IC37x = 5621157390531715953290851053455446420511073991058027520563102722436213312307;
    uint256 constant IC37y = 1058519569460216350545915299084659867202274173790110007140359516161654271772;
    
    uint256 constant IC38x = 3851305840598262055983917954009724980174140958219893924178685136350555045744;
    uint256 constant IC38y = 20148786623329133701293692366666636682627695224626038812908098210546520181337;
    
    uint256 constant IC39x = 8335820283920723619033210436996098542404681839678171805886867502133584709602;
    uint256 constant IC39y = 567256167965783438201584395491051725081035818193375587379197024148225726434;
    
    uint256 constant IC40x = 2119608704306858732601470557659267002867119427771991896289893086839506615474;
    uint256 constant IC40y = 2202295462071151459133929089078396145512367386052199258897291661021217864158;
    
    uint256 constant IC41x = 18252775234603664276751749142129476663272942157043734000804502292816113533762;
    uint256 constant IC41y = 12226516030059539840868634744858280918772344700399553760786175748769658896297;
    
    uint256 constant IC42x = 13965856150420302212761059721122136068924262169753751682436377552746576852225;
    uint256 constant IC42y = 20935011635434268145615019750633928420975098892012125354941018859376208331400;
    
    uint256 constant IC43x = 8615144659639578769073753171020054700872281008235010619875619818554853840716;
    uint256 constant IC43y = 21570844592895168714847194037366601916445059427664708058261062146775599017539;
    
    uint256 constant IC44x = 11275729624773234024696031376752950067888330355778273665502936073607075794809;
    uint256 constant IC44y = 11498874136456648542695412374193400107872461129267254259906465954143906842235;
    
    uint256 constant IC45x = 3229352586076823183323181850126166117982852464663894266544253564401776476113;
    uint256 constant IC45y = 17986932830759911240941489470787668861670290500483604765235526210257403749410;
    
    uint256 constant IC46x = 5781395561190486069388934692999102054224396030393615712555428497493320355872;
    uint256 constant IC46y = 16990963388347364896763139965031422716024211608527463714993408060350549030440;
    
    uint256 constant IC47x = 208402727515497442152236319493144476995153909348782069568078089735954473356;
    uint256 constant IC47y = 319214611114330491357628461042805629092035708320698226708034346243757714031;
    
    uint256 constant IC48x = 13326638531026320186147351385876004611550191155451227450324230251113314663699;
    uint256 constant IC48y = 16835004514604704862706616244189613784143266946839130909259628627549340837962;
    
 
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
