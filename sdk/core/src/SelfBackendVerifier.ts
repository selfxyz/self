import { ethers } from 'ethers';
import { hashEndpointWithScope } from '@selfxyz/common/utils/scope';
import { IdentityVerificationHubImpl, IdentityVerificationHubImpl__factory, Registry__factory, Verifier, Verifier__factory } from './typechain-types/index.js';
import { AttestationId, discloseIndices } from './utils/constants.js';
import { formatRevealedDataPacked } from './utils/id.js';
import { VcAndDiscloseProof } from './types/types.js';
import { Country3LetterCode } from '@selfxyz/common';
import { calculateUserIdentifierHash } from './utils/hash.js';
import { castToUserIdentifier, UserIdType } from '@selfxyz/common/utils/circuits/uuid';
import { ConfigMismatch, ConfigMismatchError, InvalidProof, InvalidProofError } from './errors.js';
import { DefaultConfigStore } from './store/DefaultConfigStore.js';
import { IConfigStorage } from './store/interface.js';
import { unpackForbiddenCountriesList } from './utils/utils.js';

const CELO_MAINNET_RPC_URL = 'https://forno.celo.org';
const CELO_TESTNET_RPC_URL = 'https://alfajores-forno.celo-testnet.org';

const IDENTITY_VERIFICATION_HUB_ADDRESS = '0x0000000000000000000000000000000000000000';
const IDENTITY_VERIFICATION_HUB_ADDRESS_STAGING = '0xb32424e64810Ffa264155419C8D898B838715E47';

export class SelfBackendVerifier {
  protected scope: string;
  protected identityVerificationHubContract: IdentityVerificationHubImpl;
  protected configStorage: IConfigStorage;
  protected provider: ethers.JsonRpcProvider;
  protected allowedIds: Map<AttestationId, boolean>;
  protected userIdentifierType: UserIdType;

  constructor(scope: string, endpoint: string, mockPassport: boolean = false, allowedIds: Map<AttestationId, boolean>, configStorage: IConfigStorage, userIdentifierType: UserIdType) {
    const rpcUrl = mockPassport ? CELO_TESTNET_RPC_URL : CELO_MAINNET_RPC_URL;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const identityVerificationHubAddress = mockPassport ? IDENTITY_VERIFICATION_HUB_ADDRESS_STAGING : IDENTITY_VERIFICATION_HUB_ADDRESS;
    this.identityVerificationHubContract = IdentityVerificationHubImpl__factory.connect(identityVerificationHubAddress, provider);
    this.provider = provider;
    this.scope = hashEndpointWithScope(endpoint, scope);
    this.allowedIds = allowedIds;
    this.configStorage = configStorage;
    this.userIdentifierType = userIdentifierType;
  }

  public async verify(
    attestationId: AttestationId,
    proof: VcAndDiscloseProof,
    userContextData: string,
  ) {
    //check if attestation id is allowed
    const allowedId = this.allowedIds.get(attestationId);
    let issues: Array<{ type: ConfigMismatch; message: string }> = [];
    if (!allowedId) {
      issues.push({ type: ConfigMismatch.InvalidId, message: 'Attestation ID is not allowed' });
    }

    const publicSignals = proof.pubSignals.map(String).map((x) => /[a-f]/g.test(x) ? '0x' + x : x);

    //check if user context hash matches
    const userContextHashInCircuit = publicSignals[discloseIndices[attestationId].userIdentifierIndex];
    const userContextHash = calculateUserIdentifierHash(userContextData);

    if (userContextHashInCircuit !== userContextHash) {
      issues.push({ type: ConfigMismatch.InvalidUserContextHash, message: 'User context hash does not match with the one in the circuit' });
    }

    //check if scope matches
    const isValidScope = this.scope === publicSignals[discloseIndices[attestationId].scopeIndex];
    if (!isValidScope) {
      issues.push({ type: ConfigMismatch.InvalidScope, message: 'Scope does not match with the one in the circuit' });
    }

    //check the root
    try {
      const registryAddress = await this.identityVerificationHubContract.registry('0x' + attestationId.toString(16).padStart(64, '0'));
      if (registryAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Registry contract not found');
      }
      console.log('registryAddress', registryAddress);
      const registryContract = Registry__factory.connect(registryAddress, this.provider);
      console.log('publicSignals[discloseIndices[attestationId].merkleRootIndex]', publicSignals[discloseIndices[attestationId].merkleRootIndex]);
      const currentRoot = await registryContract.checkIdentityCommitmentRoot(publicSignals[discloseIndices[attestationId].merkleRootIndex]);
      if (!currentRoot) {
        issues.push({ type: ConfigMismatch.InvalidRoot, message: 'Onchain root does not match with the one in the circuit' });
      }
    } catch (error) {
      throw new Error('Registry contract not found');
    }

    //check if attestation id matches
    const isValidAttestationId = attestationId.toString() === publicSignals[discloseIndices[attestationId].attestationIdIndex];
    if (!isValidAttestationId) {
      issues.push({ type: ConfigMismatch.InvalidAttestationId, message: 'Attestation ID does not match with the one in the circuit' });
    }

    const userIdentifier = castToUserIdentifier(BigInt(userContextData.slice(0, 32)), this.userIdentifierType);
    const userDefinedData = userContextData.slice(32);
    const configId = await this.configStorage.getActionId(userIdentifier, userDefinedData);
    const verificationConfig = await this.configStorage.getConfig(configId);

    //check if forbidden countries list matches
    const forbiddenCountriesList = unpackForbiddenCountriesList(verificationConfig.forbiddenCountriesListPacked.map(String));
    const forbiddenCountriesListVerificationConfig = unpackForbiddenCountriesList(verificationConfig.forbiddenCountriesListPacked.map(String));

    const isForbiddenCountryListValid = forbiddenCountriesListVerificationConfig.every(country => forbiddenCountriesList.includes(country as Country3LetterCode));
    if (!isForbiddenCountryListValid) {
      issues.push({ type: ConfigMismatch.InvalidForbiddenCountriesList, message: 'Forbidden countries list in config does not match with the one in the circuit' });
    }

    const genericDiscloseOutput = formatRevealedDataPacked(attestationId, publicSignals);
    //check if minimum age matches
    const isMinimumAgeValid = verificationConfig.olderThanEnabled ? verificationConfig.olderThan === genericDiscloseOutput.olderThan : true;
    if (!isMinimumAgeValid) {
      issues.push({ type: ConfigMismatch.InvalidMinimumAge, message: 'Minimum age in config does not match with the one in the circuit' });
    }

    const circuitTimestampYy = [2, 0, publicSignals[discloseIndices[attestationId].currentDateIndex], publicSignals[discloseIndices[attestationId].currentDateIndex + 1]];
    const circuitTimestampMm = [publicSignals[discloseIndices[attestationId].currentDateIndex + 2], publicSignals[discloseIndices[attestationId].currentDateIndex + 3]];
    const circuitTimestampDd = [publicSignals[discloseIndices[attestationId].currentDateIndex + 4], publicSignals[discloseIndices[attestationId].currentDateIndex + 5]];
    const circuitTimestamp = new Date(Number(circuitTimestampYy.join('')), Number(circuitTimestampMm.join('')) - 1, Number(circuitTimestampDd.join('')));
    const currentTimestamp = new Date();

    //check if timestamp is in the future
    if (circuitTimestamp > currentTimestamp) {
      issues.push({ type: ConfigMismatch.InvalidTimestamp, message: 'Circuit timestamp is in the future' });
    }

    //check if timestamp is 1 day in the past
    currentTimestamp.setTime(currentTimestamp.getTime() - (24 * 60 * 60 * 1000));
    if (circuitTimestamp < currentTimestamp) {
      issues.push({ type: ConfigMismatch.InvalidTimestamp, message: 'Circuit timestamp is too old' });
    }

    if (!verificationConfig.ofacEnabled[0] && genericDiscloseOutput.ofac[0]) {
      issues.push({ type: ConfigMismatch.InvalidOfac, message: 'Passport number OFAC check is not allowed' });
    }

    if (!verificationConfig.ofacEnabled[1] && genericDiscloseOutput.ofac[1]) {
      issues.push({ type: ConfigMismatch.InvalidOfac, message: 'Name and DOB OFAC check is not allowed' });
    }

    if (!verificationConfig.ofacEnabled[2] && genericDiscloseOutput.ofac[2]) {
      issues.push({ type: ConfigMismatch.InvalidOfac, message: 'Name and YOB OFAC check is not allowed' });
    }

    if (issues.length > 0) {
      throw new ConfigMismatchError(issues);
    }

    let verifierContract: Verifier;
    try {
      const verifierAddress = await this.identityVerificationHubContract.discloseVerifier('0x' + attestationId.toString(16).padStart(64, '0'));
      verifierContract = Verifier__factory.connect(verifierAddress, this.provider);
      console.log('verifierAddress', verifierAddress);
    }catch (error) {
      throw new Error('Verifier contract not found');
    }

    const isValid = await verifierContract.verifyProof(proof.a, [
      [proof.b[0][1], proof.b[0][0]],
      [proof.b[1][1], proof.b[1][0]],
    ], proof.c, publicSignals);

    if (!isValid) {
      throw new InvalidProofError(InvalidProof.InvalidProof, 'Proof is invalid');
    }

    return {
      isValid,
      discloseOutput: genericDiscloseOutput,
      userIdentifier,
      userDefinedData,
      isOlderThanValid: verificationConfig.olderThanEnabled ? verificationConfig.olderThan <= genericDiscloseOutput.olderThan : true,
      isForbiddenCountriesListValid: verificationConfig.forbiddenCountriesEnabled ? forbiddenCountriesList.includes(genericDiscloseOutput.nationality) : true,
      isOfacValid: verificationConfig.ofacEnabled.every((enabled, index) => enabled ? genericDiscloseOutput.ofac[index] : true),
    }
  }
}

(async () => {
  const allowedIds = new Map<AttestationId, boolean>();
  allowedIds.set(1, true);
  allowedIds.set(2, true);
  const verifier = new SelfBackendVerifier('https://selfxyz.io', 'https://selfxyz.io', true, allowedIds, new DefaultConfigStore({
    olderThanEnabled: false,
    olderThan: '18',
    forbiddenCountriesEnabled: false,
    forbiddenCountriesListPacked: [
      '0x414754414154414149414f4741444e414d5341415a44424c41414c41474641',
      '0x4542524c42425242444742524842534842455a415355415742414d52414752',
      '0x4e41434d484b5650434e52424c4f424e5442554d424e45425a4c42554d424c',
      '0x4853454d4559424d5a45575a5455564b4e445453454e4843564943'
    ],
    ofacEnabled: [true, true, true]
  }), 'uuid');

  // await verifier.verify(1, {
  //   "a": ["20027747457384548915754048546300078359238644739611306732203396740377022269632", "2922252454334934814523912619336295865418779710963506663844841070040892368599"],
  //   "b": [
  //     ["18550618272017193017683281599041714361177883341207882150042864009452803287635", "11835322382845835127938425066445170832745075061887634147517477198658857275684"],
  //     ["9589052941833010873145632477110100396776386222278078408779066519235765125504", "4446299920668248986575867643716084694453281451335382773821734541324874380964"]],
  //   "c": ["13869518253907120487751576221202706397626340056519243861474381557882676036567", "12690387074286053910397617351082313207917428545513560875234502132363926637665"],
  //   pubSignals: [
  //     "0",
  //     "104974056514807040022473273876258729896969411582978218858119168",
  //     "1773781688717606310397756023428205332782362187156068670010833396561870848",
  //     "6818352527182560077653388211384938507686473",
  //     "0",
  //     "0",
  //     "0",
  //     "8393865390816338643283234268763358234972139160362896016192609318836495598412",
  //     "1",
  //     "12042122855944027015224247589071180050575929049407085527795781545283481922120",
  //     "2",
  //     "5",
  //     "0",
  //     "6",
  //     "1",
  //     "5",
  //     "17359956125106148146828355805271472653597249114301196742546733402427978706344",
  //     "7420120618403967585712321281997181302561301414016003514649937965499789236588",
  //     "16836358042995742879630198413873414945978677264752036026400967422611478610995",
  //     "20547922292487865646889398151624351195094737616498816569824986876525492837134",
  //     "32484638221990080388773097521078796272"
  // ]},
  //   "1234567890"
  // );

  await verifier.verify(2,
    {
      "a": ["12081211863281045519638435814320218331506181778260003189006684934781096301530", "8060260813032756056355953005294591165747245129871184047363247350832615678279"],
      "b": [
        ["4347315068897320978820992945813773246810792668754558635019200272564387822377", "15752614222213378619781143491974874432941718433078511349040538945306489946483"],
        ["21556638492815180585049800142968980107901950444515421443099323631356046322632", "3164272229051284860567978678792807807073207139807100212958388224608073319238"]
      ],
      "c": ["5267406348608997194371334102763008174473847620068385896652634372612077418468", "14110837162069354172999846461488917221179735837657004699809342354383332253012"],
      pubSignals: [
        "0",
        "22229121118744123602918790561256186052608",
        "2154665897585346283029582512769695903067754219393865093262281634727591936",
        "1",
        "a6818352527182560077653388211384938507686473",
        "0",
        "0",
        "0",
        "12816268866992348722154762391251116294707511988403581258809971144485079648161",
        "2",
        "4473515946166166681112263978860717654366030938166274938260019677592087803375",
        "2",
        "5",
        "0",
        "6",
        "1",
        "7",
        "20550865940766091336114076617084411967227963708544788410483208672684333597871",
        "20607501071671444315195585339157145490348308593668944037177822930025980459166",
        "13934606664243914063643606771911468856671016933765586820821710153612586828695",
        "185590350843347269691547707205927446533"
      ]
    },
    "1234567890"
  );
})();
