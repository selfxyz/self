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

contract Verifier_prove_rsa_65537_sha1 {
    // Scalar field size
    uint256 constant r =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax =
        20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 constant alphay =
        9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 constant betax1 =
        4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 constant betax2 =
        6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 constant betay1 =
        21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 constant betay2 =
        10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 constant gammax1 =
        11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 =
        10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 =
        4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 =
        8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 =
        21452715633120911361862105553686801401590781318637067278235026691728221987534;
    uint256 constant deltax2 =
        17697748329424235882442339015232894634945946841602985615876614690189273332246;
    uint256 constant deltay1 =
        8432840579991691830166522179128730020194962037524348669213128421568185965652;
    uint256 constant deltay2 =
        7114082469164964811442975649448815360052876098237679848112659330679974452057;

    uint256 constant IC0x =
        10126454449013684520692849424675249984010843907026242092785734644099122935561;
    uint256 constant IC0y =
        18165129580146372375944085048043565252508724964285627938365135860423025300972;

    uint256 constant IC1x =
        273132958545079969804861387752964889456543482651279481783469645881747862780;
    uint256 constant IC1y =
        4265834889363532176588979694147365337465420980149462152580879528794277590749;

    uint256 constant IC2x =
        19602843630053742546785105169262635167166538274352082194324291401819415498894;
    uint256 constant IC2y =
        20153726278466083964217723344950490754061219397111709792038160200556065327227;

    uint256 constant IC3x =
        17119303667841033787659218634221142944918127929052826089482658386486011814812;
    uint256 constant IC3y =
        21417573076360513652704142794506137371051305275377472232059802839007851851730;

    uint256 constant IC4x =
        12562850146573762733669306470544237871517249554904945690549458646338854014755;
    uint256 constant IC4y =
        21187514492319836004505832859137775428221640138389527670104281453986806424170;

    uint256 constant IC5x =
        19497425513129424409634862851355231215451158032836293267423189672696983720549;
    uint256 constant IC5y =
        20286487948004345242128721860757027499241265465738519681772433202010614105933;

    uint256 constant IC6x =
        18509551512666185835951022741885734029297146627330180884164452550305583133403;
    uint256 constant IC6y =
        12498127293610235437447307894839310112793111373977881173194906160675613705275;

    uint256 constant IC7x =
        10435753743687251712231145529283889218292077240654573568960831152031037127361;
    uint256 constant IC7y =
        182608953414618484561330062957321881651639302032960479315935161606919390299;

    uint256 constant IC8x =
        17857912983929690958498757730865148764820930192496667390407418080195347661325;
    uint256 constant IC8y =
        10394617625337634691688521309035546582886710487877093776224540946768544444991;

    uint256 constant IC9x =
        20299811552955103720446776286911269806518120829264974336618125679066556984;
    uint256 constant IC9y =
        9845903276337149083275851899798887752939213599485165044341148654495377115272;

    uint256 constant IC10x =
        5215679767871187722468463444814667378666836283248900787878632100048053721707;
    uint256 constant IC10y =
        2314431082051132402161770081666863014192110771068279335776761324171519797735;

    uint256 constant IC11x =
        13906029421322284334290312970995297117548964850716443446924811285866338033563;
    uint256 constant IC11y =
        929398004957038257477693656368530866500476512006045139485024731069658178750;

    uint256 constant IC12x =
        14772331232678386734265928265962327923726994891273100517424096093028005412087;
    uint256 constant IC12y =
        12276835148353416160278150184718904056602294616106512516020339141469193702207;

    uint256 constant IC13x =
        21689540483556337291387680801292482400489998035150782212086004592785576374667;
    uint256 constant IC13y =
        14948695578219312017866011248387110522919700774476909611047509123166458787368;

    uint256 constant IC14x =
        3452861179749445406187904516495321026780899887438119571013638661313307378020;
    uint256 constant IC14y =
        11506907590844281451108474048751040974363965608705175579484594676608434628812;

    uint256 constant IC15x =
        1279085915693267369950780375324347037990796018582844568568731378701972108611;
    uint256 constant IC15y =
        15666267582843787316837266383996894746413845310881816081014652267715142377201;

    uint256 constant IC16x =
        7734747304335153325057551490998783598398085175113508599570499735356891886826;
    uint256 constant IC16y =
        16734365148074915436772919844831442382856763647248800992977023082807624791358;

    uint256 constant IC17x =
        5726565079011626340176764029232997831380348927502605166608317616645450243441;
    uint256 constant IC17y =
        20404835423302317043745302739070437722744788395184218503748066116295066047985;

    uint256 constant IC18x =
        15941275260952757408144174833251044555931675223726328644398767354686683492629;
    uint256 constant IC18y =
        9167962256909890832722026963346507036090962108617228343131712635902744331416;

    uint256 constant IC19x =
        9416923845668335879836878983726397128643405466365001333725005193495184774437;
    uint256 constant IC19y =
        20993269627342761374526647232053443188721160054433353381836073781765635135154;

    uint256 constant IC20x =
        20094304839658303585071252142323779454390717240801970582171612516214046773749;
    uint256 constant IC20y =
        10366065566698024509238722623055977351817743701279547903223341456284987268829;

    uint256 constant IC21x =
        15744365463039631283333846157844663144004001452875820351116155535612046128432;
    uint256 constant IC21y =
        13638723386075156875176006479075806125932201754530348938799724149134009200902;

    uint256 constant IC22x =
        10547267839183990686269588357739415286476729588570430655072067965386935437128;
    uint256 constant IC22y =
        20149669363452427743322105394638434457153116021684623990142279057675442664196;

    uint256 constant IC23x =
        15680684952209414151904894601449818552993571679984124036333160279394072302240;
    uint256 constant IC23y =
        18812448066884663802962115789849207747873586742455359404295495728578216591524;

    uint256 constant IC24x =
        14205750970667175454887568166917568106816233775231991469642856919438620571590;
    uint256 constant IC24y =
        14144993262386689368407600415523934331988916810480672000838109686672117159227;

    uint256 constant IC25x =
        15975399808423692236621698636750762903212071171509385820082965425074294684242;
    uint256 constant IC25y =
        7724897267460729197405357078413467343987302099904499529303951045898008827975;

    uint256 constant IC26x =
        8622029675476210613468489181559324964056688980335173814496531601962021609194;
    uint256 constant IC26y =
        21245771208146821724199482251160827696566817934919887273736157319120648683243;

    uint256 constant IC27x =
        9755317819709857907421556210036483256696945311939120749695901222234809076466;
    uint256 constant IC27y =
        5259830958089737526145273999342246368132122189342069342066549906408813843683;

    uint256 constant IC28x =
        6083710747650181878013970078803333857111801151888226252797718053444486417021;
    uint256 constant IC28y =
        10181335626218748727541355766826053140381801330079288530570727645941327776516;

    uint256 constant IC29x =
        7810113892663038091365284514449777296702751881358627987507802056359360361482;
    uint256 constant IC29y =
        13543799201488154112887989131288935947427587168678874682065367036762722034579;

    uint256 constant IC30x =
        14995897494843530477029030548247380825434146333303665041844502564993821701245;
    uint256 constant IC30y =
        19401004375997758608506653161172667927903185565634957716911401853454528580470;

    uint256 constant IC31x =
        2541847170989925621604285448241683932186714196286869867150457960285568854488;
    uint256 constant IC31y =
        4920461560284819913946874694962478798389226614631678028927436572411178863223;

    uint256 constant IC32x =
        1184842794324525356288392467381573531344668513216896525602300999756176319411;
    uint256 constant IC32y =
        18326362853150258608100592118495088829043094360643783749239918585842776415784;

    uint256 constant IC33x =
        1825660721748120762317671868848474586306719003620133714649763252724391599384;
    uint256 constant IC33y =
        21476365961657051962155093066231600677088037777697488494950179558265031621500;

    uint256 constant IC34x =
        10797411369156084321766597549947570983294740293189852455956878584968530718992;
    uint256 constant IC34y =
        16397598783599424813277225354898679983513451148107204158460957309937631391133;

    uint256 constant IC35x =
        5944724327007343174113119978405437570273650736263005778121105145840547542124;
    uint256 constant IC35y =
        892451106342932880803705787598282146928290409236889610984997223618411108139;

    uint256 constant IC36x =
        1150113035107702056133506208334261871968694629141519608205888026781955369105;
    uint256 constant IC36y =
        12258227933815273236108870011379905043796309152168011616510487484697200579373;

    uint256 constant IC37x =
        19887635031059042317526689625469388969339290140559112762510749274262542888967;
    uint256 constant IC37y =
        7548337671356640608722731423980512240300401138395281283545071491543804849129;

    uint256 constant IC38x =
        8684694145797234296005325014802237438181565494919131549394522213350156318339;
    uint256 constant IC38y =
        14415712717180739517389379969392845164851199921284369313782749078834791885254;

    uint256 constant IC39x =
        7999005715060351547909761852343288526951260495832991454772119528323317183383;
    uint256 constant IC39y =
        12332107170070557816677825841806708878763413990800410798433319156518470352260;

    uint256 constant IC40x =
        6704047575976264090246063400131835046854223266362090690519494477630234348644;
    uint256 constant IC40y =
        12082146473233241859799932248816073121598345631500997089835030296104400426867;

    uint256 constant IC41x =
        16325442384293456097928192571829557802108467094709316005339038122455949038196;
    uint256 constant IC41y =
        15984031748867253984242639179582693041905193789739557851609277911295347282301;

    uint256 constant IC42x =
        17381077048204758882668688672332237936085668780803893400325882331527123140098;
    uint256 constant IC42y =
        12024831608468203097292495897335027851916424036308770911625717791169275383532;

    uint256 constant IC43x =
        7886462203978101035884837248532427472697225480845315053230066273313771753558;
    uint256 constant IC43y =
        12339130015785740724534493601398476477462200755537951553268082972974104316451;

    uint256 constant IC44x =
        7973057775084932562455416690513621676496956279604808108060097002139241439488;
    uint256 constant IC44y =
        7099044423216954907031696398466912002258262222176028924532360133624359744987;

    uint256 constant IC45x =
        5781795172255491036169940597778132220709678115304139918952994513206728366411;
    uint256 constant IC45y =
        3540156473891277606575496768843933563649803902867692370914932444802922218826;

    uint256 constant IC46x =
        15704344835774869559983022517352249896612599018678597144738683172327234318953;
    uint256 constant IC46y =
        5676699688055928722703343993188560826913332257978871844690420799325725345109;

    uint256 constant IC47x =
        3169054763228000545047181999091772243732390458078209104233486454084933738329;
    uint256 constant IC47y =
        13757602833606923957231240165478879616512750686373991039025692380294479678872;

    uint256 constant IC48x =
        15408891314251959939129165119028698321581370245210413538235576978994659450328;
    uint256 constant IC48y =
        10719215729832317138618126961354154992692433907400737012555132776573497868466;

    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[48] calldata _pubSignals
    ) public view returns (bool) {
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

                g1_mulAccC(
                    _pVk,
                    IC10x,
                    IC10y,
                    calldataload(add(pubSignals, 288))
                )

                g1_mulAccC(
                    _pVk,
                    IC11x,
                    IC11y,
                    calldataload(add(pubSignals, 320))
                )

                g1_mulAccC(
                    _pVk,
                    IC12x,
                    IC12y,
                    calldataload(add(pubSignals, 352))
                )

                g1_mulAccC(
                    _pVk,
                    IC13x,
                    IC13y,
                    calldataload(add(pubSignals, 384))
                )

                g1_mulAccC(
                    _pVk,
                    IC14x,
                    IC14y,
                    calldataload(add(pubSignals, 416))
                )

                g1_mulAccC(
                    _pVk,
                    IC15x,
                    IC15y,
                    calldataload(add(pubSignals, 448))
                )

                g1_mulAccC(
                    _pVk,
                    IC16x,
                    IC16y,
                    calldataload(add(pubSignals, 480))
                )

                g1_mulAccC(
                    _pVk,
                    IC17x,
                    IC17y,
                    calldataload(add(pubSignals, 512))
                )

                g1_mulAccC(
                    _pVk,
                    IC18x,
                    IC18y,
                    calldataload(add(pubSignals, 544))
                )

                g1_mulAccC(
                    _pVk,
                    IC19x,
                    IC19y,
                    calldataload(add(pubSignals, 576))
                )

                g1_mulAccC(
                    _pVk,
                    IC20x,
                    IC20y,
                    calldataload(add(pubSignals, 608))
                )

                g1_mulAccC(
                    _pVk,
                    IC21x,
                    IC21y,
                    calldataload(add(pubSignals, 640))
                )

                g1_mulAccC(
                    _pVk,
                    IC22x,
                    IC22y,
                    calldataload(add(pubSignals, 672))
                )

                g1_mulAccC(
                    _pVk,
                    IC23x,
                    IC23y,
                    calldataload(add(pubSignals, 704))
                )

                g1_mulAccC(
                    _pVk,
                    IC24x,
                    IC24y,
                    calldataload(add(pubSignals, 736))
                )

                g1_mulAccC(
                    _pVk,
                    IC25x,
                    IC25y,
                    calldataload(add(pubSignals, 768))
                )

                g1_mulAccC(
                    _pVk,
                    IC26x,
                    IC26y,
                    calldataload(add(pubSignals, 800))
                )

                g1_mulAccC(
                    _pVk,
                    IC27x,
                    IC27y,
                    calldataload(add(pubSignals, 832))
                )

                g1_mulAccC(
                    _pVk,
                    IC28x,
                    IC28y,
                    calldataload(add(pubSignals, 864))
                )

                g1_mulAccC(
                    _pVk,
                    IC29x,
                    IC29y,
                    calldataload(add(pubSignals, 896))
                )

                g1_mulAccC(
                    _pVk,
                    IC30x,
                    IC30y,
                    calldataload(add(pubSignals, 928))
                )

                g1_mulAccC(
                    _pVk,
                    IC31x,
                    IC31y,
                    calldataload(add(pubSignals, 960))
                )

                g1_mulAccC(
                    _pVk,
                    IC32x,
                    IC32y,
                    calldataload(add(pubSignals, 992))
                )

                g1_mulAccC(
                    _pVk,
                    IC33x,
                    IC33y,
                    calldataload(add(pubSignals, 1024))
                )

                g1_mulAccC(
                    _pVk,
                    IC34x,
                    IC34y,
                    calldataload(add(pubSignals, 1056))
                )

                g1_mulAccC(
                    _pVk,
                    IC35x,
                    IC35y,
                    calldataload(add(pubSignals, 1088))
                )

                g1_mulAccC(
                    _pVk,
                    IC36x,
                    IC36y,
                    calldataload(add(pubSignals, 1120))
                )

                g1_mulAccC(
                    _pVk,
                    IC37x,
                    IC37y,
                    calldataload(add(pubSignals, 1152))
                )

                g1_mulAccC(
                    _pVk,
                    IC38x,
                    IC38y,
                    calldataload(add(pubSignals, 1184))
                )

                g1_mulAccC(
                    _pVk,
                    IC39x,
                    IC39y,
                    calldataload(add(pubSignals, 1216))
                )

                g1_mulAccC(
                    _pVk,
                    IC40x,
                    IC40y,
                    calldataload(add(pubSignals, 1248))
                )

                g1_mulAccC(
                    _pVk,
                    IC41x,
                    IC41y,
                    calldataload(add(pubSignals, 1280))
                )

                g1_mulAccC(
                    _pVk,
                    IC42x,
                    IC42y,
                    calldataload(add(pubSignals, 1312))
                )

                g1_mulAccC(
                    _pVk,
                    IC43x,
                    IC43y,
                    calldataload(add(pubSignals, 1344))
                )

                g1_mulAccC(
                    _pVk,
                    IC44x,
                    IC44y,
                    calldataload(add(pubSignals, 1376))
                )

                g1_mulAccC(
                    _pVk,
                    IC45x,
                    IC45y,
                    calldataload(add(pubSignals, 1408))
                )

                g1_mulAccC(
                    _pVk,
                    IC46x,
                    IC46y,
                    calldataload(add(pubSignals, 1440))
                )

                g1_mulAccC(
                    _pVk,
                    IC47x,
                    IC47y,
                    calldataload(add(pubSignals, 1472))
                )

                g1_mulAccC(
                    _pVk,
                    IC48x,
                    IC48y,
                    calldataload(add(pubSignals, 1504))
                )

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(
                    add(_pPairing, 32),
                    mod(sub(q, calldataload(add(pA, 32))), q)
                )

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

                let success := staticcall(
                    sub(gas(), 2000),
                    8,
                    _pPairing,
                    768,
                    _pPairing,
                    0x20
                )

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
