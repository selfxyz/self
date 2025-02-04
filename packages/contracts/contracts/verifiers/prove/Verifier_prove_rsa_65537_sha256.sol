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
    uint256 constant deltax1 = 13712669930807027066432455963920004753804575153306478154082225172540894791697;
    uint256 constant deltax2 = 14621056654033030159111384006506361438733969388519830162058188044378001616013;
    uint256 constant deltay1 = 8648865297679023017392575432725553399779724355967143745086353612497178809510;
    uint256 constant deltay2 = 21664748003830939002021923557411259243652793372223608877730406967860908232579;

    
    uint256 constant IC0x = 18837847330460101767470685001162782791541723452908436811770248703422385774364;
    uint256 constant IC0y = 13924593305026026107933010319328520261235500792223955967488219194416191858218;
    
    uint256 constant IC1x = 18499035744135408535006498619187878301564976457052297587006457806425510673636;
    uint256 constant IC1y = 7226548414236873699673490761763172101403491901987747605307552092067988817369;
    
    uint256 constant IC2x = 15076998223900447147424484817648709178376766854878255045911605115135846913714;
    uint256 constant IC2y = 1588555885165810180157418868205800830691130731692806042865483039743264904188;
    
    uint256 constant IC3x = 9963925548680369694281529428493633860798787720411551209962187028714238599244;
    uint256 constant IC3y = 15230355743339633214614822894639457206342798359948816221317666466364056693778;
    
    uint256 constant IC4x = 6950503983449781600992674217118280101447858351713896494323644937055764792179;
    uint256 constant IC4y = 7808371895612695836144162291280415010167996463807346279391316375701199123656;
    
    uint256 constant IC5x = 13087819526106045804491969868083814032877953990371363285347311427240882433405;
    uint256 constant IC5y = 11966315196652888498918569284209954760513051208513943007355755386005245500621;
    
    uint256 constant IC6x = 12282094920874016072527195101275592151196471143933884133850581178083772252468;
    uint256 constant IC6y = 15235775181834492665531005890809584611442500045185485789836774473981675243021;
    
    uint256 constant IC7x = 21812893128244174490845186114318384111309631750779790216970477092597858785848;
    uint256 constant IC7y = 2589668621973063987240457489694488373626065998506803531328282066733461219789;
    
    uint256 constant IC8x = 19736662517096924810330699257646097752878927062458868611606640349386574406597;
    uint256 constant IC8y = 4060072089820676848549092831416954645358719303909012118727092426282594652097;
    
    uint256 constant IC9x = 11719045032278320337718855450887707488077032991245401830404333912363712928329;
    uint256 constant IC9y = 20429459895397450814127488292309624504089765803886468608012330383192001870669;
    
    uint256 constant IC10x = 19004300167179661071877369317533970354840401420580304563087979100558811364752;
    uint256 constant IC10y = 14022355176806855344226798992865107732568349801838395169345899640004492990780;
    
    uint256 constant IC11x = 13025111431804865430474042749794279094175996106474252922476866200732597336046;
    uint256 constant IC11y = 19194822113343343818445001979787110041399069657752328387546318167620461948345;
    
    uint256 constant IC12x = 9281420432070758003455252378726458803842106759942105235771363724299995612746;
    uint256 constant IC12y = 10868451960138543140016636651288606302763103558353989956931009739891356663931;
    
    uint256 constant IC13x = 6881336186311591694695019764740377864808644241540598555149034884273494350187;
    uint256 constant IC13y = 2786626651294071079928778385820392810695323510322088767264869337774915531398;
    
    uint256 constant IC14x = 3868887205879058647589024065476442552380444440663584200982400886666148790886;
    uint256 constant IC14y = 11551675778288798821641950282239822965295574518488993089870363480882633402459;
    
    uint256 constant IC15x = 15813415033010213936605839865891774355917576449019813469202169386353113595525;
    uint256 constant IC15y = 1870609980383477505308305636362868336100621908783112905201075702227453404515;
    
    uint256 constant IC16x = 21157749399797355849483685908557759044725963489573087916410489368331599307794;
    uint256 constant IC16y = 14854788610114730057746604308209140307245160608186995032258954670144804516951;
    
    uint256 constant IC17x = 16385822015903726360112736921395358523788300915122301306552678753856007139950;
    uint256 constant IC17y = 21852835770022094372574175833966771172218278214837381092449524015831270082443;
    
    uint256 constant IC18x = 19248229849556541284232787022946438125257193537403487445681116918406935705772;
    uint256 constant IC18y = 6793532544675704467666654331031442502924492451846685587791069517168976618998;
    
    uint256 constant IC19x = 18836493774186273716542303051216191129399492669285916094819482474147823428307;
    uint256 constant IC19y = 6509216046298943932406178827402599665125001577776608255883440730727474111293;
    
    uint256 constant IC20x = 2809621426118306485690309749022510198095154893010698079349725235989206182716;
    uint256 constant IC20y = 4497399751266171421893644701436353917277499549766569195676686979408432567040;
    
    uint256 constant IC21x = 6170933041071274746144995882643288027398824461699676189537821814335178617455;
    uint256 constant IC21y = 11939422270083845120808849126065865852360008142577598821317493776193010862067;
    
    uint256 constant IC22x = 13907558045406644600787852336772673795175470348585502650967694884336926510609;
    uint256 constant IC22y = 10402183670236567810177022075839926456374913570620093187656925228836601635112;
    
    uint256 constant IC23x = 9838642093868354522737246454481472310758813632867424849018704154654047098002;
    uint256 constant IC23y = 14170682187871718359141978372219783598112313240689881926254383115412693527146;
    
    uint256 constant IC24x = 19268808621727088609886330192714416713650881167710481846410131194840574819112;
    uint256 constant IC24y = 4548738826497792767156172897040645223030132393843932100535275236775868885881;
    
    uint256 constant IC25x = 1232597044718469636783882051858339480293220683836150648093038756719345792733;
    uint256 constant IC25y = 4164564286518446421261975868208035039046547841927122039276997213757603100039;
    
    uint256 constant IC26x = 5294620535222419533372104895954254795204154607883725935765987312986783187633;
    uint256 constant IC26y = 1510029808556715440734681023178490974005286595460173200541383072987550292273;
    
    uint256 constant IC27x = 7913521827196573900757966679883707039843053961079282485559952654357012865178;
    uint256 constant IC27y = 12822272309007319462325152966219603030360768804371467102819817670179571110561;
    
    uint256 constant IC28x = 11741856835780496736124514582563930032103983891200913422564159143798432491425;
    uint256 constant IC28y = 1186685996713398101844576210414267184996946163374847451849537513476110807467;
    
    uint256 constant IC29x = 3848448520214659071169420881995284083054226208336229906265856219238707518565;
    uint256 constant IC29y = 12381374183899166684143029657071579470205894330864920551795150885160592446021;
    
    uint256 constant IC30x = 2729354333883753415251820919113586347364808857675492186344760048485902311739;
    uint256 constant IC30y = 15156786867835927048585286604426887268249585171019125857459307501585887100974;
    
    uint256 constant IC31x = 16327260115537188860691343668951285278159950664733445048928882023437126306794;
    uint256 constant IC31y = 15469859044222521064134805435371078520376095849473017636140479838581816450418;
    
    uint256 constant IC32x = 9716588579885449992683804112491878761164620027004437304769643243506657789021;
    uint256 constant IC32y = 4292706684411927078028017507044791383954395251541518728702327216870791282903;
    
    uint256 constant IC33x = 3831081473705850109604085868551425990958661808755750553828925508405362814908;
    uint256 constant IC33y = 7692088199943626776992448758764793963791676479101773985328943563508103917662;
    
    uint256 constant IC34x = 14553842600721830593567536989022992714300892536915530699049444789457197924996;
    uint256 constant IC34y = 1034992513758432733967666097255620384731263408100321609845288946444012846161;
    
    uint256 constant IC35x = 8298955061619332575841977271384783772861434116506072222428896327020549590778;
    uint256 constant IC35y = 3417308972480405311337590188121737420812511616327499449644814830511455229125;
    
    uint256 constant IC36x = 17492972350290531881303108441024194391834883043603735002548578305198527539792;
    uint256 constant IC36y = 20178093813925833001632123131014833838779278549203596933431582561790322377177;
    
    uint256 constant IC37x = 20266961211116442799505089820504252966764415195756292869126528880324253997340;
    uint256 constant IC37y = 12721789314780990071009310805499247522750756905074142078629315686295071200692;
    
    uint256 constant IC38x = 2848503208668242872636925431606615634594079979671099350197778718883635724263;
    uint256 constant IC38y = 4654302785281536218111627060020949573498492991361181450337516475942903887229;
    
    uint256 constant IC39x = 8117348408366486765069198284524473502421701109551785034877096925063881017611;
    uint256 constant IC39y = 9240711853483292534294774801520720851385345818400239892620763606707852365913;
    
    uint256 constant IC40x = 14726850444695139754420062135396416349332736703641747713568870234740172750594;
    uint256 constant IC40y = 19695982391909446471699547638880558431250407146813365085967041143148712990281;
    
    uint256 constant IC41x = 10713887585841823429966077588975547340632721253524339816841192298502141129142;
    uint256 constant IC41y = 15875414001171419054582031537391697841529253632260086276963072228015908768572;
    
    uint256 constant IC42x = 8726527790501042190955587753490550968193378562596306669177536293797796528295;
    uint256 constant IC42y = 2567561473507954539369683410861518721775690943462480886913419763755359623122;
    
    uint256 constant IC43x = 20228003583559059699534488013186856436814319213991227118734829746090088629768;
    uint256 constant IC43y = 3062194835746234285630044060950549287869018179041416439415198981293605738893;
    
    uint256 constant IC44x = 15326430247878492538731905607224792134839791639951162876881030896580260626530;
    uint256 constant IC44y = 3286497031007325457398280838270081812804433848003710004921976210893659583713;
    
    uint256 constant IC45x = 21172455070651382026237320306432651725116860744924112007014279936313214413699;
    uint256 constant IC45y = 3124713746257151433204645213247841462846602236377570194562035843093051589347;
    
    uint256 constant IC46x = 586329559940161576696101534294134289580198770923725856103144741895937907876;
    uint256 constant IC46y = 8549358505942194684807970498040082081114943321990836277323952699459596852004;
    
    uint256 constant IC47x = 10801780763283804426115126946120589447640285117455543080483767206343304180554;
    uint256 constant IC47y = 10884989352940730579839064046335509450313089154054617399581142310521031798261;
    
    uint256 constant IC48x = 7642110729948206734175115603784267089466490166359943206653870027902551255488;
    uint256 constant IC48y = 11475699997476077360759438942765927072551540977873657634945729769964213394775;
    
    uint256 constant IC49x = 6477632809823450072672399006410105825115578703752819060774243488278595863752;
    uint256 constant IC49y = 5842794419924960246061189125669290725098229148434953995106895999043038757426;
    
    uint256 constant IC50x = 9851792234521580273104967216407455160006004510538086041246868797144654998160;
    uint256 constant IC50y = 11682999507634805671497034306879162257155282925402112526209517483082417200425;
    
    uint256 constant IC51x = 7849825230838163134393354944881831816101066439604289649483128481654599764130;
    uint256 constant IC51y = 19425402357687722197365422640263552055101566124507367803085779467136114966243;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[51] calldata _pubSignals) public view returns (bool) {
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
                
                g1_mulAccC(_pVk, IC49x, IC49y, calldataload(add(pubSignals, 1536)))
                
                g1_mulAccC(_pVk, IC50x, IC50y, calldataload(add(pubSignals, 1568)))
                
                g1_mulAccC(_pVk, IC51x, IC51y, calldataload(add(pubSignals, 1600)))
                

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
            
            checkField(calldataload(add(_pubSignals, 1568)))
            
            checkField(calldataload(add(_pubSignals, 1600)))
            
            checkField(calldataload(add(_pubSignals, 1632)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
