import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  NativeModules,
  DeviceEventEmitter,
  TextInput,
  Platform,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import {
  Text,
  GluestackUIProvider,
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckIcon,
  CheckboxLabel,
  Input,
  InputField,
  ButtonText,
  ButtonIcon,
  Button,
  Spinner,
  View,
  ButtonSpinner,
} from "@gluestack-ui/themed"
import { config } from "@gluestack-ui/config" // Optional if you want to use default theme
import Toast, { BaseToast, ErrorToast, SuccessToast, ToastProps } from 'react-native-toast-message';

// @ts-ignore
import PassportReader from 'react-native-passport-reader';
import {getFirstName, formatDuration, checkInputs } from './utils/utils';
import {
  DEFAULT_PNUMBER,
  DEFAULT_DOB,
  DEFAULT_DOE,
  DEFAULT_ADDRESS,
} from '@env';
import {DataHash, PassportData} from '../common/src/utils/types';
import {AWS_ENDPOINT} from '../common/src/constants/constants';
import {
  hash,
  toUnsignedByte,
  bytesToBigDecimal,
  dataHashesObjToArray,
  formatAndConcatenateDataHashes,
  formatMrz,
  splitToWords,
  hexStringToSignedIntArray
} from '../common/src/utils/utils';
import { samplePassportData } from '../common/src/utils/passportDataStatic';

import "@ethersproject/shims"
import { ethers } from "ethers";
import axios from 'axios';
import groth16ExportSolidityCallData from './utils/snarkjs';
import contractAddresses from "./deployments/addresses.json"
import proofOfPassportArtefact from "./deployments/ProofOfPassport.json";
import forge from 'node-forge';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

console.log('DEFAULT_PNUMBER', DEFAULT_PNUMBER);

const SKIP_SCAN = false;

const attributeToPosition = {
  issuing_state: [2, 5],
  name: [5, 44],
  passport_number: [44, 52],
  nationality: [54, 57],
  date_of_birth: [57, 63],
  gender: [64, 65],
  expiry_date: [65, 71],
}

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [passportNumber, setPassportNumber] = useState(DEFAULT_PNUMBER ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(DEFAULT_DOB ?? '');
  const [dateOfExpiry, setDateOfExpiry] = useState(DEFAULT_DOE ?? '');
  const [address, setAddress] = useState(DEFAULT_ADDRESS ?? '');
  const [passportData, setPassportData] = useState<PassportData | null>(null);
  const [step, setStep] = useState('enterDetails');
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const [generatingProof, setGeneratingProof] = useState<boolean>(false);

  const [proofTime, setProofTime] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [proof, setProof] = useState<{proof: string, inputs: string} | null>(null);
  const [minting, setMinting] = useState<boolean>(false);
  const [mintText, setMintText] = useState<string | null>(null);

  const [disclosure, setDisclosure] = useState({
    issuing_state: false,
    name: false,
    passport_number: false,
    nationality: false,
    date_of_birth: false,
    gender: false,
    expiry_date: false,
  });
  
  const handleDisclosureChange = (field: keyof typeof disclosure) => {
    setDisclosure(
      {...disclosure,
        [field]: !disclosure[field]
      });
  };

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  useEffect(() => {
    const logEventListener = DeviceEventEmitter.addListener('LOG_EVENT', e => {
      console.log(e);
    });

    return () => {
      logEventListener.remove();
    };
  }, []);

  useEffect(() => {
    if (SKIP_SCAN && passportData === null) {
      setPassportData(samplePassportData as PassportData);
      setStep('scanCompleted');
    }
  }, []);

  async function handleResponseIOS(response: any) {
    const parsed = JSON.parse(response);

    const eContentBase64 = parsed.eContentBase64;
    const signatureAlgorithm = parsed.signatureAlgorithm;
    const mrz = parsed.passportMRZ;
    const dataGroupHashes = parsed.dataGroupHashes;
    const signatureBase64 = parsed.signatureBase64;
    
    console.log('parsed.documentSigningCertificate', parsed.documentSigningCertificate)
    const pem = JSON.parse(parsed.documentSigningCertificate).PEM.replace(/\\\\n/g, '\n')
    console.log('pem', pem)
    
    const cert = forge.pki.certificateFromPem(pem);
    const publicKey = cert.publicKey;
    console.log('publicKey', publicKey)
    
    const modulus = (publicKey as any).n.toString(10);
    
    const eContentArray = Array.from(Buffer.from(eContentBase64, 'base64'));
    const signedEContentArray = eContentArray.map(byte => byte > 127 ? byte - 256 : byte);
    
    const dgHashes = JSON.parse(dataGroupHashes);
    console.log('dgHashes', dgHashes)
    
    const dataGroupHashesArray = Object.keys(dgHashes)
      .map(key => {
        const dgNumber = parseInt(key.replace('DG', ''));
        const hashArray = hexStringToSignedIntArray(dgHashes[key].computedHash);
        return [dgNumber, hashArray];
      })
      .sort((a, b) => (a[0] as number) - (b[0] as number));
    
    const encryptedDigestArray = Array.from(Buffer.from(signatureBase64, 'base64')).map(byte => byte > 127 ? byte - 256 : byte);
    
    const passportData = {
      mrz,
      signatureAlgorithm,
      pubKey: {
        modulus: modulus,
      },
      dataGroupHashes: dataGroupHashesArray as DataHash[],
      eContent: signedEContentArray,
      encryptedDigest: encryptedDigestArray,
    };
    
    console.log('mrz', passportData.mrz);
    console.log('signatureAlgorithm', passportData.signatureAlgorithm);
    console.log('pubKey', passportData.pubKey);
    console.log('dataGroupHashes', passportData.dataGroupHashes);
    console.log('eContent', passportData.eContent);
    console.log('encryptedDigest', passportData.encryptedDigest);

    setPassportData(passportData);
    setStep('scanCompleted');
  }

  async function handleResponseAndroid(response: any) {
    const {
      mrz,
      signatureAlgorithm,
      modulus,
      curveName,
      publicKeyQ,
      dataGroupHashes,
      eContent,
      encryptedDigest,
    } = response;

    const passportData: PassportData = {
      mrz: mrz.replace(/\n/g, ''),
      signatureAlgorithm: signatureAlgorithm,
      pubKey: {
        modulus: modulus,
        curveName: curveName,
        publicKeyQ: publicKeyQ,
      },
      dataGroupHashes: dataHashesObjToArray(JSON.parse(dataGroupHashes)),
      eContent: JSON.parse(eContent),
      encryptedDigest: JSON.parse(encryptedDigest),
    };

    console.log('mrz', passportData.mrz);
    console.log('signatureAlgorithm', passportData.signatureAlgorithm);
    console.log('pubKey', passportData.pubKey);
    console.log('dataGroupHashes', passportData.dataGroupHashes);
    console.log('eContent', passportData.eContent);
    console.log('encryptedDigest', passportData.encryptedDigest);

    setPassportData(passportData);
    setStep('scanCompleted');
  }

  async function scan() {
    const check = checkInputs(passportNumber, dateOfBirth, dateOfExpiry)
    if (!check.success) {
      Toast.show({
        type: 'error',
        text1: check.message,
      })
      return
    }

    console.log('scanning...');
    setStep('scanning');

    if (Platform.OS === 'android') {
      scanAndroid();
    } else {
      scanIOS();
    }
  }

  async function scanAndroid() {
    try {
      const response = await PassportReader.scan({
        documentNumber: passportNumber,
        dateOfBirth: dateOfBirth,
        dateOfExpiry: dateOfExpiry,
      });
      console.log('response', response);
      console.log('scanned');
      handleResponseAndroid(response);
    } catch (e: any) {
      console.log('error during scan :', e);
      Toast.show({
        type: 'error',
        text1: e.message,
      })
    }
  }

  async function scanIOS() {
    try {
      const response = await NativeModules.PassportReader.scanPassport(
        passportNumber,
        dateOfBirth,
        dateOfExpiry
      );
      console.log('response', response);
      console.log('scanned');
      handleResponseIOS(response);
    } catch (e: any) {
      console.log('error during scan :', e);
      Toast.show({
        type: 'error',
        text1: e.message,
      })
    }
  }

  const handleProve = async () => {
    if (passportData === null) {
      console.log('passport data is null');
      return;
    }

    setGeneratingProof(true)
    await new Promise(resolve => setTimeout(resolve, 10));

    // 1. TODO check signature to make sure the proof will work

    // 2. Format all the data as inputs for the circuit
    const formattedMrz = formatMrz(passportData.mrz);
    const mrzHash = hash(formatMrz(passportData.mrz));
    const concatenatedDataHashes = formatAndConcatenateDataHashes(
      mrzHash,
      passportData.dataGroupHashes as DataHash[],
    );
    
    
    const reveal_bitmap = Array.from({ length: 88 }, (_) => '0');

    for(const attribute in disclosure) {
      if (disclosure[attribute as keyof typeof disclosure]) {
        const [start, end] = attributeToPosition[attribute as keyof typeof attributeToPosition];
        for(let i = start; i <= end; i++) {
          reveal_bitmap[i] = '1';
        }
      }
    }

    if (passportData.signatureAlgorithm !== "SHA256withRSA") {
      console.log(`${passportData.signatureAlgorithm} not supported for proof right now.`);
      setError(`${passportData.signatureAlgorithm} not supported for proof right now.`);
      return;
    }

    const inputs = {
      mrz: Array.from(formattedMrz).map(byte => String(byte)),
      reveal_bitmap: reveal_bitmap.map(byte => String(byte)),
      dataHashes: Array.from(concatenatedDataHashes.map(toUnsignedByte)).map(byte => String(byte)),
      eContentBytes: Array.from(passportData.eContent.map(toUnsignedByte)).map(byte => String(byte)),
      signature: splitToWords(
        BigInt(bytesToBigDecimal(passportData.encryptedDigest)),
        BigInt(64),
        BigInt(32)
      ),
      pubkey: splitToWords(
        BigInt(passportData.pubKey.modulus as string),
        BigInt(64),
        BigInt(32)
      ),
      address,
    }

    // 3. Generate a proof of passport
    const start = Date.now();
    NativeModules.RNPassportReader.provePassport(inputs, (err: any, res: any) => {
      const end = Date.now();

      if (err) {
        console.error(err);
        setError(
          "err: " + err.toString(),
        );
        return
      }
      console.log("res", res);
      const parsedResponse = JSON.parse(res);
      console.log('parsedResponse', parsedResponse);
      console.log('parsedResponse.duration', parsedResponse.duration);

      const deserializedProof = JSON.parse(parsedResponse.serialized_proof);
      console.log('deserializedProof', deserializedProof);

      const deserializedInputs = JSON.parse(parsedResponse.serialized_inputs);
      console.log('deserializedInputs', deserializedInputs);
      
      setProofTime(parsedResponse.duration);
      setTotalTime(end - start);

      setProof({
        proof: JSON.stringify(deserializedProof),
        inputs: JSON.stringify(deserializedInputs),
      });
      setGeneratingProof(false)
      setStep('proofGenerated');
    });
  };

  const handleMint = async () => {
    setMinting(true)
    if (!proof?.proof || !proof?.inputs) {
      console.log('proof or inputs is null');
      return;
    }
    if (!contractAddresses.ProofOfPassport || !proofOfPassportArtefact.abi) {
      console.log('contracts addresses or abi not found');
      return;
    }

    // Format the proof and publicInputs as calldata for the verifier contract
    const p = JSON.parse(proof.proof);
    const i = JSON.parse(proof.inputs);
    // const p = {"a": ["16502577771187684977980616374304236605057905196561863637384296592370445017998", "3901861368174142739149849352179287633574688417834634300291202761562972709023"], "b": [["14543689684654938043989715590415160645004827219804187355799512446208262437248", "2758656853017552407340621959452084149765188239766723663849017782705599048610"], ["11277365272183899064677884160333958573750879878546952615484891009952508146334", "6233152645613613236466445508816847016425532566954931368157994995587995754446"]], "c": ["6117026818273543012196632774531089444191538074414171872462281003025766583671", "10261526153619394223629018490329697233150978685332753612996629076672112420472"]}
    // const i = ["0", "0", "0", "146183216590389235917737925524385821154", "43653084046336027166990", "21085389953176386480267", "56519161086598100699293", "15779090386165698845937", "23690430366843652392111", "22932463418406768540896", "51019038683800409078189", "50360649287615093470666", "47789371969706091489401", "15311247864741754764238", "20579290199534174842880", "1318168358802144844680228651107716082931624381008"]
    console.log('p', p);
    console.log('i', i);
    const cd = groth16ExportSolidityCallData(p, i);
    const callData = JSON.parse(`[${cd}]`);
    console.log('callData', callData);

    // format transaction
    // for now, we do it all on mumbai
    try {
      const provider = new ethers.JsonRpcProvider('https://polygon-mumbai-bor.publicnode.com');
      const proofOfPassportOnMumbai = new ethers.Contract(contractAddresses.ProofOfPassport, proofOfPassportArtefact.abi, provider);

      const transactionRequest = await proofOfPassportOnMumbai
        .mint.populateTransaction(...callData);
      console.log('transactionRequest', transactionRequest);

      const response = await axios.post(AWS_ENDPOINT, {
        chain: "mumbai",
        tx_data: transactionRequest
      });
      console.log('response status', response.status)
      console.log('response data', response.data)
      setMintText(`Network: Mumbai. Transaction hash: ${response.data.hash}`)
      const receipt = await provider.waitForTransaction(response.data.hash);
      console.log('receipt', receipt)
      if (receipt?.status === 1) {
        Toast.show({
          type: 'success',
          text1: 'Proof of passport minted',
        })
        setMintText(`SBT minted. Network: Mumbai. Transaction hash: ${response.data.hash}`)
      } else {
        Toast.show({
          type: 'error',
          text1: 'Proof of passport minting failed',
        })
        setMintText(`Error minting SBT. Network: Mumbai. Transaction hash: ${response.data.hash}`)
      }
    } catch (err) {
      console.log('err', err);
    }
  };

  return (
    <GluestackUIProvider config={config}>
      <SafeAreaView style={backgroundStyle}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={backgroundStyle.backgroundColor}
        />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}
        >
          <View>
            {step === 'enterDetails' ? (
              <View style={styles.sectionContainer}>
                <Text style={styles.header}>Welcome to Proof of Passport</Text>
                <Text style={{textAlign: "center", fontSize: 20, marginTop: 20, marginBottom: 20}}>Enter Your Passport Details</Text>
                <Text>Passport Number</Text>
                <Input
                  variant="outline"
                  size="md"
                  marginBottom={10}
                  marginTop={4}
                >
                  <InputField
                    value={passportNumber}
                    onChangeText={setPassportNumber}
                    placeholder={"Passport Number"}
                  />
                </Input>
                <Text>Date of Birth</Text>
                <Input
                  variant="outline"
                  size="md"
                  marginBottom={10}
                  marginTop={4}
                >
                  <InputField
                    value={dateOfBirth}
                    onChangeText={setDateOfBirth}
                    placeholder={"YYMMDD"}
                  />
                </Input>
                <Text>Date of Expiry</Text>
                <Input
                  variant="outline"
                  size="md"
                  marginBottom={10}
                  marginTop={4}
                >
                  <InputField
                    value={dateOfExpiry}
                    onChangeText={setDateOfExpiry}
                    placeholder={"YYMMDD"}
                  />
                </Input>

                <Button
                  onPress={scan}
                  marginTop={10}
                >
                  <ButtonText>Scan Passport with NFC</ButtonText>
                  {/* <ButtonIcon as={AddIcon} /> */}
                </Button>
              </View>
            ) : null}
            {step === 'scanning' ? (
              <View style={styles.sectionContainer}>
                <Text style={styles.header}>Put your phone on your passport</Text>
                <Spinner
                  size={60}
                  style={{marginTop: 70}}
                />
              </View>
            ) : null}
            {step === 'scanCompleted' && passportData ? (
              <View style={styles.sectionContainer}>
                <Text style={styles.header}>
                  Hi {getFirstName(passportData.mrz)}
                </Text>
                <View
                  marginTop={20}
                  marginBottom={20}
                >
                  <Text
                    marginBottom={5}
                  >
                    Signature algorithm: {passportData.signatureAlgorithm}
                  </Text>
                  <Text
                    marginBottom={10}
                  >
                    What do you want to disclose ?
                  </Text>
                  {Object.keys(disclosure).map((key) => {
                    const keyy = key as keyof typeof disclosure;
                    const indexes = attributeToPosition[keyy];
                    const keyFormatted = keyy.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    const mrzAttribute = passportData.mrz.slice(indexes[0], indexes[1])
                    const mrzAttributeFormatted = mrzAttribute.replace(/</g, ' ')
                    
                    return (
                      <View key={key} margin={2} width={"$full"} flexDirection="row" justifyContent="space-between">
                        <View maxWidth={"$5/6"}>
                          <Text
                            style={{fontWeight: "bold"}}
                          >
                            {keyFormatted}:{" "}
                          </Text>
                          <Text>
                            {mrzAttributeFormatted}
                          </Text>
                        </View>
                        <Checkbox
                          value={key}
                          isChecked={disclosure[keyy]}
                          onChange={() => handleDisclosureChange(keyy)}
                          size="lg"
                          aria-label={key}
                        >
                          <CheckboxIndicator mr="$2">
                            <CheckboxIcon as={CheckIcon} />
                          </CheckboxIndicator>
                        </Checkbox>
                      </View>
                    )
                  })}
                </View>
                <Text>Enter your address or ens</Text>
                <Input
                  variant="outline"
                  size="md"
                  marginBottom={10}
                  marginTop={4}
                >
                  <InputField
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Your Address or ens name"
                  />
                </Input>

                {generatingProof ?
                  <Button
                    onPress={handleProve}
                  >
                    <ButtonSpinner mr="$1" />
                    <ButtonText>Generating zk proof</ButtonText>
                  </Button>
                  : <Button
                      onPress={handleProve}
                    >
                      <ButtonText>Generate zk proof</ButtonText>
                    </Button>
                }
              </View>
            ) : null}
            {step === 'proofGenerated' ? (
              <View style={styles.sectionContainer}>
                <Text style={styles.header}>Zero-knowledge proof generated</Text>

                <Text style={{fontWeight: "bold"}}>
                  Proof:
                </Text>
                <Text>
                  {JSON.stringify(proof)}
                </Text>

                <Text>
                  <Text style={{ fontWeight: 'bold' }}>Proof Duration:</Text> {formatDuration(proofTime)}
                </Text>     
                <Text>
                  <Text style={{ fontWeight: 'bold' }}>Total Duration:</Text> {formatDuration(totalTime)}
                </Text>

                <Button
                  onPress={handleMint}
                  marginTop={10}
                >
                  <ButtonText>Mint Proof of Passport</ButtonText>
                </Button>
                {mintText && <Text>
                  {mintText}
                </Text>}
              </View>
            ) : null}
          </View>
          <View style={{...styles.sectionContainer, ...styles.testSection, marginTop: 80}}>
            <Text style={{...styles.sectionDescription, textAlign: "center"}}>Test functions</Text>

            <Button
              onPress={async () => {
                NativeModules.RNPassportReader.callRustLib((err: any, res: any) => {
                  if (err) {
                    console.error(err);
                    setTestResult(err);
                  } else {
                    console.log(res); // Should log "5"
                    setTestResult(res);
                  }
                });
              }}
              marginTop={10}
            >
              <ButtonText>Call arkworks lib</ButtonText>
            </Button>
            {testResult && <Text>{testResult}</Text>}

            <Button
              onPress={async () => {
                const res = await NativeModules.Prover.runInitAction()
                console.log('res', res)
              }}
              marginTop={10}
            >
              <ButtonText>runInitAction</ButtonText>
            </Button>

            <Button
              onPress={async () => {
                // careful, address here is in decimal
                const inputsIOS = {"mrz":["97","91","95","31","88","80","60","70","82","65","68","85","80","79","78","84","60","60","65","76","80","72","79","78","83","69","60","72","85","71","85","69","83","60","65","76","66","69","82","84","60","60","60","60","60","60","60","60","60","50","52","72","66","56","49","56","51","50","52","70","82","65","48","52","48","50","49","49","49","77","51","49","49","49","49","49","53","60","60","60","60","60","60","60","60","60","60","60","60","60","60","48","50"],"reveal_bitmap":["0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0"],"dataHashes":["48","130","1","37","2","1","0","48","11","6","9","96","134","72","1","101","3","4","2","1","48","130","1","17","48","37","2","1","1","4","32","176","223","31","133","108","84","158","102","70","11","165","175","196","12","201","130","25","131","46","125","156","194","28","23","55","133","157","164","135","136","220","78","48","37","2","1","2","4","32","190","82","180","235","222","33","79","50","152","136","142","35","116","224","6","242","156","141","128","248","10","61","98","86","248","45","207","210","90","232","175","38","48","37","2","1","3","4","32","0","194","104","108","237","246","97","230","116","198","69","110","26","87","17","89","110","199","108","250","36","21","39","87","110","102","250","213","174","131","171","174","48","37","2","1","11","4","32","136","155","87","144","111","15","152","127","85","25","154","81","20","58","51","75","193","116","234","0","60","30","29","30","183","141","72","247","255","203","100","124","48","37","2","1","12","4","32","41","234","106","78","31","11","114","137","237","17","92","71","134","47","62","78","189","233","201","214","53","4","47","189","201","133","6","121","34","131","64","142","48","37","2","1","13","4","32","91","222","210","193","62","222","104","82","36","41","138","253","70","15","148","208","156","45","105","171","241","195","185","43","217","162","146","201","222","89","238","38","48","37","2","1","14","4","32","76","123","216","13","51","227","72","245","59","193","238","166","103","49","23","164","171","188","194","197","156","187","249","28","198","95","69","15","182","56","54","38"],"eContentBytes":["49","102","48","21","6","9","42","134","72","134","247","13","1","9","3","49","8","6","6","103","129","8","1","1","1","48","28","6","9","42","134","72","134","247","13","1","9","5","49","15","23","13","49","57","49","50","49","54","49","55","50","50","51","56","90","48","47","6","9","42","134","72","134","247","13","1","9","4","49","34","4","32","32","85","108","174","127","112","178","182","8","43","134","123","192","211","131","66","184","240","212","181","240","180","106","195","24","117","54","129","19","10","250","53"],"signature":["7924608050410952186","18020331358710788578","8570093713362871693","158124167841380627","11368970785933558334","13741644704804016484","3255497432248429697","18325134696633464276","11159517223698754974","14221210644107127310","18395843719389189885","14516795783073238806","2008163829408627473","10489977208787195755","11349558951945231290","10261182129521943851","898517390497363184","7991226362010359134","16695870541274258886","3471091665352332245","9966265751297511656","15030994431171601215","10723494832064770597","14939163534927288303","13596611050508022203","12058746125656824488","7806259275107295093","9171418878976478189","16438005721800053020","315207309308375554","3950355816720285857","5415176625244763446"],"pubkey":["10501872816920780427","9734403015003984321","14411195268255541454","5140370262757446136","442944543003039303","2084906169692591819","13619051978156646232","11308439966240653768","11784026229075891869","3619707049269329199","14678094225574041482","13372281921787791985","5760458619375959191","1351001273751492154","9127780359628047919","5377643070972775368","14145972494784958946","295160036043261024","12244573192558293296","13273111070076476096","15787778596745267629","12026125372525341435","17186889501189543072","1678833675164196298","11525741336698300342","9004411014119053043","3653149686233893817","3525782291631180893","13397424121878903415","12208454420188007950","5024240771370648155","15842149209258762075"],"address":["897585614395172552642670145532424661022951192962"]}
                const res = await NativeModules.Prover.runProveAction(inputsIOS)
                console.log('res', res)
              }}
              marginTop={10}
            >
              <ButtonText>runProveAction</ButtonText>
            </Button>

            <Button
              onPress={async () => {
                const res = await NativeModules.Prover.runVerifyAction()
                console.log('res', res)
              }}
              marginTop={10}
            >
              <ButtonText>runVerifyAction</ButtonText>
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
      <Toast config={toastConfig} />
    </GluestackUIProvider>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  testSection: {
    backgroundColor: '#f2f2f2', // different background color
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#dcdcdc', // adding a border top with a light color
    marginTop: 15,
  },
});

export default App;


export const toastConfig = {
  info: (props: ToastProps) => (
    <BaseToast
      {...props}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 15,
        fontWeight: "500",
      }}
    />
  ),
  error: (props: ToastProps) => (
    <ErrorToast
      {...props}
      contentContainerStyle={{ paddingHorizontal: 15}}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 15,
        fontWeight: "400",
      }}
    />
  ),
  success: (props: ToastProps) => (
    <SuccessToast
      {...props}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 15,
        fontWeight: "400",
      }}
    />
  ),
};
