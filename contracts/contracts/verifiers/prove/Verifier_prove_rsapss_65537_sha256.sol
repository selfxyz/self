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
    uint256 constant deltax1 = 840175615859777066971117990046729712872908780746615543749618419155081422465;
    uint256 constant deltax2 = 13898832434902503793511275667807151598234498579494646135178617639223874009166;
    uint256 constant deltay1 = 15189587227266559567040834895777722937957202157744378596167598932026377227308;
    uint256 constant deltay2 = 4647650721910271156853240456470357454046170566908206036854512090332292988729;

    
    uint256 constant IC0x = 18828689441131713476370561468152341920705152328894083816753570559445295350831;
    uint256 constant IC0y = 12468185377064389496523053694479109458649191186191980070601463135640652409238;
    
    uint256 constant IC1x = 6190965892659127650056130177379288932842927480400022738451523102603530356843;
    uint256 constant IC1y = 19966361350846940565503194150760059822338854334530623362561597966259152276531;
    
    uint256 constant IC2x = 641624377468687992386627381461492954248477869450887404072236641638751817139;
    uint256 constant IC2y = 1798351702844638585639167532548547417029027085944739373139964910239906767619;
    
    uint256 constant IC3x = 9078717687351241016693642161276812273027597851846098419734086700763437524687;
    uint256 constant IC3y = 286595839462794932876777319168256161942003053911515147672299995755865654950;
    
    uint256 constant IC4x = 19678785798967756939471487543649829119076226762291705501957274524478637515394;
    uint256 constant IC4y = 8063767312464359952499927936066381335309234089197796313078125660560736617075;
    
    uint256 constant IC5x = 17410878684062807805669952952809342820506852012145172658504282757942771204377;
    uint256 constant IC5y = 4129238635610559787022215897463137859716434998248128312751355441731401605762;
    
    uint256 constant IC6x = 9770660952965396929528656682456647233364571453014460818043021750517470169118;
    uint256 constant IC6y = 4791504987733897887697399286322921024283764760282482670607699078545170249118;
    
    uint256 constant IC7x = 3607464122183156654139381354673773380836692536884118155657083811284381528444;
    uint256 constant IC7y = 18903198612424961414273628971920758295067351361282766162991964006331331858834;
    
    uint256 constant IC8x = 17921394482127879931439236386938581996725873114360146822139684944220575696672;
    uint256 constant IC8y = 976749023966698014462054027575734679151282290448469936367650316912056767810;
    
    uint256 constant IC9x = 18171436472965147415982022005224435446007700245676118568365801451116604469671;
    uint256 constant IC9y = 4596310153351176924598693582836473096251071702284274380400925883818608000946;
    
    uint256 constant IC10x = 4207329320140233477130999948215298008293253000161009893318084783341969299792;
    uint256 constant IC10y = 11230697896531967328849996725193968556732819319683415500152957574706186962091;
    
    uint256 constant IC11x = 8221904023746147007658691455100549792518674169436843384183484920885103518395;
    uint256 constant IC11y = 14554927861514989203064039961624449225958654406569386536774595119909872908486;
    
    uint256 constant IC12x = 17925070891818672612054284531925292824629972916014950423082016103456020664773;
    uint256 constant IC12y = 16755272064112242434312565091151512268537999919684687653510990188197697639030;
    
    uint256 constant IC13x = 471460009484523867844757014389538752581410804129008394749259292567689102258;
    uint256 constant IC13y = 16289503819198852582073135208295277872684603077493698596222045998081492659937;
    
    uint256 constant IC14x = 15534325487075154265518662498231507229987177289600851445018767748964736460791;
    uint256 constant IC14y = 10666849693797639706906257476531779806991906058708433555698323667290588070005;
    
    uint256 constant IC15x = 14484633802789673562721216434570317230353645231931971113546092275247361042445;
    uint256 constant IC15y = 15403617073233495891821332289733451615834079980610799586803058795781264614184;
    
    uint256 constant IC16x = 242767816417185951493083754950375623589253942853516507426835459822754172542;
    uint256 constant IC16y = 9833931565797794834671494292257084159835934523916970620867712935747958295651;
    
    uint256 constant IC17x = 1239046796208137181422705813893463798560584763077469037685356808131701084735;
    uint256 constant IC17y = 4003108127529899462304464533010171667958373654781705107285426272051291359863;
    
    uint256 constant IC18x = 2603965021032923403678252925819985592713347476722770379874491545451064515808;
    uint256 constant IC18y = 20411304065804654865407533546911882770833761730943840145121903818605784853620;
    
    uint256 constant IC19x = 19723490862702859912468008984373531384563439553930817684723275433978364549459;
    uint256 constant IC19y = 2295297772761538909239101526218134452633800620481430898589247267741858575184;
    
    uint256 constant IC20x = 9450165606768223384234803694669010136837172040800449522149016113404619897980;
    uint256 constant IC20y = 4884896027271955078976795299478256398056020938320544219796570450842150569333;
    
    uint256 constant IC21x = 10882627888419071254846085919915599304847804814231849020705290612827477312496;
    uint256 constant IC21y = 16649022562931291902559700652009454940733792271461905171465103021432044808618;
    
    uint256 constant IC22x = 10701145975376995220912456047736436181391200794745824827114963863176868324127;
    uint256 constant IC22y = 6936652513382889366344127462963063229862442623428046815037247163743471907627;
    
    uint256 constant IC23x = 1428180779223937813350989568000342555955533538788805527487696985812368052470;
    uint256 constant IC23y = 17929734092166426829552553538051282671214806335924777706826786146080155649183;
    
    uint256 constant IC24x = 4498206416781390344686657126857923157802772324352646169217524262724516466102;
    uint256 constant IC24y = 6965421876236544363783446635830965573442070867434382790237320063109320113721;
    
    uint256 constant IC25x = 21680583751495012216337980044771436138871566247326117674893477723066350071174;
    uint256 constant IC25y = 6392700944002219562907785363029536173946711426362142747062592499391161247813;
    
    uint256 constant IC26x = 579253708132507150464737327781310954503086856909998907626118886238497959089;
    uint256 constant IC26y = 17801923023923209218567214464778142743254877924757534220526420788262872682139;
    
    uint256 constant IC27x = 11402929564885814214059627897421085365886460502461867609447668174925352062712;
    uint256 constant IC27y = 10854993226008642624901176420202026869053745808511534957508835300159593475096;
    
    uint256 constant IC28x = 9760860503328221755093101056923229284411696958213694827209396290171418983909;
    uint256 constant IC28y = 19812836327315708881863517681213475275501404439217487307496866611146436135871;
    
    uint256 constant IC29x = 15586907577048283575997332676130392819335722808225160132720442579491856829460;
    uint256 constant IC29y = 11775068007973062628036380782318514202586507239548394581067980653525360030172;
    
    uint256 constant IC30x = 11400982299873503207589086015006709126250335795582362744422804792916762129714;
    uint256 constant IC30y = 10850822079590119872863314184078720621266479251514325748088381894338243676627;
    
    uint256 constant IC31x = 8063021084833668343870653631134678984263460964306201917225239172392348836555;
    uint256 constant IC31y = 17190962837555831651315434883380287410807064105318101509857392729537335419051;
    
    uint256 constant IC32x = 6352963195530653339722007666049575232314792209839418580554598951692147987116;
    uint256 constant IC32y = 8574371780437284614950447689438499626975327395510810066506632225282244012199;
    
    uint256 constant IC33x = 9730237400940633717002222506441465196046135302050120636610125758978859374819;
    uint256 constant IC33y = 8848455147563473273027157748056596918515252429304972356861885047068405547944;
    
    uint256 constant IC34x = 20425503157220411220126911619549212847054676026393692769415618402601653703206;
    uint256 constant IC34y = 1207478378461141871718040294007814967124855778732645099270712317541854982159;
    
    uint256 constant IC35x = 14520832827334916215921997418741254295851463233900419216235854858511347445071;
    uint256 constant IC35y = 3498267082583656472355928910487393266998327828391727372911731438289561511274;
    
    uint256 constant IC36x = 18565636209599617602958565977892111156847977054045845629726066036302112690204;
    uint256 constant IC36y = 13176938301048222736943773873930903102640066195968255719012988609710106827234;
    
    uint256 constant IC37x = 3152589017615923566554735614787471265394265038878515179663817935639819318536;
    uint256 constant IC37y = 10813252251658858702340992565634551465066688120028113918594756547527538763234;
    
    uint256 constant IC38x = 294262461663742958898755818109928242629068272439380232334688004498297980545;
    uint256 constant IC38y = 4687975691751184079878547193904593228596402532747761129328108921693814842979;
    
    uint256 constant IC39x = 7328418480715616644508083494613778171692384775979802177971296567057974236931;
    uint256 constant IC39y = 13650064131314624932009200820097145906811461337283130716704951586979959874144;
    
    uint256 constant IC40x = 9249427900729992598531947565726648774526221364563155154864641091711614494400;
    uint256 constant IC40y = 12846280397219237618974298500603707189010834528487948663446498750911935619762;
    
    uint256 constant IC41x = 4731949876099477072613196722760882244765152621582247217527506310728774605544;
    uint256 constant IC41y = 11672919166563344168056999191545957954917838133591499432467661103873983133843;
    
    uint256 constant IC42x = 19785529801107599539500867800823990754636444572049628278412979356579622773803;
    uint256 constant IC42y = 15081972084059633151968990984155848627402338831818834914844718420447513087842;
    
    uint256 constant IC43x = 4281547256845322197419861469686354378276190462693646862517091708364400206383;
    uint256 constant IC43y = 7794233391909715390949874901667011724521761640199034817992262849554007551171;
    
    uint256 constant IC44x = 14692527030370689315281850229599158449502451631536532560315067031480827536088;
    uint256 constant IC44y = 7604622050415703743064347977242676616541595835096566519781249957368180497610;
    
    uint256 constant IC45x = 10302950739222708768659715283784754828051042172035256762635624794900300238053;
    uint256 constant IC45y = 17977890961655152284190323559081062221169337289557777156977421485344639985313;
    
    uint256 constant IC46x = 2712855079369154003343370854387146394743942929530132697555234442686143604630;
    uint256 constant IC46y = 18671318957733671347491353851832646104045226554512080592255034269610721807761;
    
    uint256 constant IC47x = 16531524456304076309917880826092899033864144405295352187539970557476031070169;
    uint256 constant IC47y = 235879934643644345953664733071907470516311462628660209856393218799278880631;
    
    uint256 constant IC48x = 19098421955482534465421399972298661633815528843779432364076060729088741516621;
    uint256 constant IC48y = 5368774772124832532477910149380978852017213661193555295496010136564134645019;
    
    uint256 constant IC49x = 11166414856379189874433351966947035128760027817804181238122313527230250686655;
    uint256 constant IC49y = 4754628589068725270179162901945794003178243561198185640413360003596049673491;
    
    uint256 constant IC50x = 519242835557865654878889326587655202298740853937483933790129334653596729608;
    uint256 constant IC50y = 7473355062649344029589955383434973693820498625515573758851151921048808905519;
    
    uint256 constant IC51x = 5396201642913687824793004424420855556916930084273336172241397162883698346940;
    uint256 constant IC51y = 431336272786823851918190453774786728494520936465126639342842028273264124826;
    
 
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
