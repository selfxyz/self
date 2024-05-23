import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Button, Tabs, Sheet, Label, Fieldset, Input, Switch, H2, Image, useWindowDimensions, H4, H3 } from 'tamagui'
import { HelpCircle, IterationCw, VenetianMask, Cog, CheckCircle2, ChevronLeft } from '@tamagui/lucide-icons';
import X from '../images/x.png'
import Telegram from '../images/telegram.png'
import Github from '../images/github.png'
import Internet from "../images/internet.png"
import ScanScreen from './ScanScreen';
import ProveScreen from './ProveScreen';
import { Steps } from '../utils/utils';
import AppScreen from './AppScreen';
import { Linking, Modal, Platform, Pressable } from 'react-native';
import NFC_IMAGE from '../images/nfc.png'
import { bgColor, blueColorLight, borderColor, componentBgColor, textColor1, textColor2 } from '../utils/colors';
import SendProofScreen from './SendProofScreen';
import { ToastViewport } from '@tamagui/toast';
import { ToastMessage } from '../components/ToastMessage';
import { CircuitName, fetchZkey } from '../utils/zkeyDownload';
import useUserStore from '../stores/userStore';
import { scan } from '../utils/nfcScanner';
import useNavigationStore from '../stores/navigationStore';
import NfcScreen from './NfcScreen';
import CameraScreen from './CameraScreen';
import { mockPassportData_sha256WithRSAEncryption_65537 } from '../../../common/src/utils/mockPassportData';

const MainScreen: React.FC = () => {
  const [NFCScanIsOpen, setNFCScanIsOpen] = useState(false);
  const [SettingsIsOpen, setSettingsIsOpen] = useState(false);
  const [HelpIsOpen, setHelpIsOpen] = useState(false);
  const [brokenCamera, setBrokenCamera] = useState(false);
  const [sheetIsOpen, setSheetIsOpen] = useState(false);

  const {
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
    deleteMrzFields,
    update,
    clearPassportDataFromStorage,
    clearSecretFromStorage,
    registerCommitment,
    secret
  } = useUserStore()

  const decrementStep = () => {
    if (selectedTab === "nfc") {
      updateNavigationStore({
        selectedTab: "scan",
      })
    }
    else if (selectedTab === "app") {
      updateNavigationStore({
        selectedTab: "nfc",
      })
    }
    else if (selectedTab === "prove") {
      updateNavigationStore({
        selectedTab: "app",
      })
    }
  };

  const {
    showWarningModal,
    update: updateNavigationStore,
    step,
    setStep,
    selectedTab,
    hideData,
    toast
  } = useNavigationStore();

  const handleRestart = () => {
    updateNavigationStore({
      selectedTab: "scan",
      selectedApp: null,
      step: Steps.MRZ_SCAN,
    })
    deleteMrzFields();
  }

  const handleSkip = () => {
    registerCommitment(
      secret,
      mockPassportData_sha256WithRSAEncryption_65537
    )
    update({
      passportData: mockPassportData_sha256WithRSAEncryption_65537
    })
    setStep(Steps.NFC_SCAN_COMPLETED);
    deleteMrzFields();
    toast?.show("Using mock passport data!", { type: "info" })
  }

  const handleHideData = () => {
    updateNavigationStore({
      hideData: !hideData,
    })
  }
  const handleNFCScan = () => {
    if ((Platform.OS === 'ios')) {
      console.log('ios');
      scan();
    }
    else {
      console.log('android :)');
      setNFCScanIsOpen(true);
      scan();
    }
  }

  useEffect(() => {
    if (passportNumber?.length === 9 && (dateOfBirth?.length === 6 && dateOfExpiry?.length === 6)) {
      setStep(Steps.MRZ_SCAN_COMPLETED);
    }
  }, [passportNumber, dateOfBirth, dateOfExpiry]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (step == Steps.MRZ_SCAN) {
      updateNavigationStore({
        selectedTab: "scan",
      })
      timeoutId = setTimeout(() => {
        setNFCScanIsOpen(false);
      }, 0);
    }
    else if (step == Steps.MRZ_SCAN_COMPLETED) {
      updateNavigationStore({
        selectedTab: "nfc",
      })
      timeoutId = setTimeout(() => {
        setNFCScanIsOpen(false);
      }, 0);
    }
    else if (step == Steps.NFC_SCAN_COMPLETED) {
      // Set the timeout and store its ID
      timeoutId = setTimeout(() => {
        setNFCScanIsOpen(false);
      }, 700);
    }
    else if (step == Steps.PROOF_GENERATED) {
      updateNavigationStore({
        selectedTab: "mint",
      })
    }
    if (step == Steps.NFC_SCAN_COMPLETED) {
      updateNavigationStore({
        selectedTab: "app",
      })
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [step]);

  const { height } = useWindowDimensions();

  return (
    <>
      <YStack f={1} bc="#161616" mt={Platform.OS === 'ios' ? "$8" : "$0"} >
        <YStack >
          <XStack jc="space-between" ai="center" px="$3">
            <Button p="$2" py="$3" unstyled onPress={decrementStep}><ChevronLeft color={selectedTab === "scan" ? "transparent" : "#a0a0a0"} /></Button>

            <Text fontSize="$6" color="#a0a0a0">
              {selectedTab === "scan" ? "Scan" : (selectedTab === "app" ? "Apps" : "Prove")}
            </Text>
            <XStack>
              <Button p="$2" py="$3" unstyled onPress={() => setSettingsIsOpen(true)}><Cog color="#a0a0a0" /></Button>
              <Button p="$2" py="$3" unstyled onPress={() => setHelpIsOpen(true)}><HelpCircle color="#a0a0a0" /></Button>
            </XStack>
          </XStack>
          <Sheet open={NFCScanIsOpen} onOpenChange={setNFCScanIsOpen} dismissOnSnapToBottom modal dismissOnOverlayPress={false} disableDrag animation="medium" snapPoints={[35]}>
            <Sheet.Overlay />
            <Sheet.Frame>
              <YStack gap="$5" f={1} pt="$3">
                <H2 textAlign='center'>Ready to scan</H2>
                {step >= Steps.NFC_SCAN_COMPLETED ?
                  <CheckCircle2
                    size="$8"
                    alignSelf='center'
                    color="#3185FC"
                    animation="quick"
                  /> :
                  <Image
                    h="$8"
                    w="$8"
                    alignSelf='center'
                    borderRadius={1000}
                    source={{
                      uri: NFC_IMAGE
                    }}
                  />
                }
                <Text textAlign='center'>Hold your device near the NFC tag and stop moving when it vibrates.</Text>
              </YStack>
            </Sheet.Frame>
          </Sheet>

          <Sheet open={SettingsIsOpen} onOpenChange={setSettingsIsOpen} dismissOnSnapToBottom modal animation="medium" snapPoints={[88]}>
            <Sheet.Overlay />
            <Sheet.Frame bg={bgColor} borderRadius="$9">
              <YStack p="$3" pb="$5" f={1} gap={height > 750 ? "$3" : "$1"} mb="$1.5">
                <XStack gap="$2" ml="$2" >
                  <H2 color={textColor1}>Settings</H2>
                  <Cog color={textColor1} mt="$1" alignSelf='center' size="$2" />
                </XStack>
                <Fieldset horizontal>
                  <Label color={textColor1} width={225} justifyContent="flex-end" htmlFor="name" >
                    Broken camera
                  </Label>
                  <Switch size="$3.5" checked={brokenCamera} onCheckedChange={setBrokenCamera}>
                    <Switch.Thumb animation="bouncy" bc={bgColor} />
                  </Switch>
                </Fieldset>
                {
                  brokenCamera &&
                  <YStack pl="$3" gap="$1">
                    <Fieldset gap="$4" horizontal>
                      <Label color={textColor1} width={160} justifyContent="flex-end" fontSize={13}>
                        Passport Number
                      </Label>
                      <Input
                        bg={componentBgColor}
                        color={textColor1}
                        h="$3.5"
                        borderColor={passportNumber?.length === 9 ? "green" : "unset"}
                        flex={1}
                        id="passportnumber"
                        onChangeText={(text) => {
                          update({ passportNumber: text.toUpperCase() })
                        }}
                        value={passportNumber}
                        keyboardType="default"
                      />
                    </Fieldset>
                    <Fieldset gap="$4" horizontal>
                      <Label color={textColor1} width={160} justifyContent="flex-end" fontSize={13}>
                        Date of birth (yymmdd)
                      </Label>
                      <Input
                        bg={componentBgColor}
                        color={textColor1}
                        h="$3.5"
                        borderColor={dateOfBirth?.length === 6 ? "green" : "unset"}
                        flex={1}
                        id="dateofbirth"
                        onChangeText={(text) => {
                          update({ dateOfBirth: text })
                        }}
                        value={dateOfBirth}
                        keyboardType={Platform.OS === "ios" ? "default" : "number-pad"}
                      />
                    </Fieldset>
                    <Fieldset gap="$4" horizontal>
                      <Label color={textColor1} width={160} justifyContent="flex-end" fontSize={13}>
                        Date of expiry (yymmdd)
                      </Label>
                      <Input
                        bg={componentBgColor}
                        color={textColor1}
                        h="$3.5"
                        borderColor={dateOfExpiry?.length === 6 ? "green" : "unset"}
                        flex={1}
                        id="dateofexpiry"
                        onChangeText={(text) => {
                          update({ dateOfExpiry: text })
                        }}
                        value={dateOfExpiry}
                        keyboardType={Platform.OS === "ios" ? "default" : "number-pad"}
                      />
                    </Fieldset>
                  </YStack>
                }

                <Fieldset horizontal>
                  <Label color={textColor1} width={225} justifyContent="flex-end" htmlFor="restart" >
                    Private mode
                  </Label>
                  <Switch size="$3.5" checked={hideData} onCheckedChange={handleHideData}>
                    <Switch.Thumb animation="bouncy" bc={bgColor} />
                  </Switch>
                </Fieldset>

                <Fieldset gap="$4" mt="$1" horizontal>
                  <Label color={textColor1} width={200} justifyContent="flex-end" htmlFor="restart">
                    Restart to step 1
                  </Label>
                  <Button bg={componentBgColor} jc="center" borderColor={borderColor} borderWidth={1.2} size="$3.5" ml="$2" onPress={handleRestart}>
                    <IterationCw color={textColor1} />
                  </Button>
                </Fieldset>

                <Fieldset gap="$4" mt="$1" horizontal>
                  <Label color={textColor1} width={200} justifyContent="flex-end" htmlFor="skip" >
                    Use mock passport data
                  </Label>
                  <Button bg={componentBgColor} jc="center" borderColor={borderColor} borderWidth={1.2} size="$3.5" ml="$2" onPress={handleSkip}>
                    <VenetianMask color={textColor1} />
                  </Button>
                </Fieldset>

                <Fieldset gap="$4" mt="$1" horizontal>
                  <Label color={textColor1} width={200} justifyContent="flex-end" htmlFor="skip" >
                    Delete passport data
                  </Label>
                  <Button bg={componentBgColor} jc="center" borderColor={borderColor} borderWidth={1.2} size="$3.5" ml="$2" onPress={clearPassportDataFromStorage}>
                    <VenetianMask color={textColor1} />
                  </Button>
                </Fieldset>

                <Fieldset gap="$4" mt="$1" horizontal>
                  <Label color={textColor1} width={200} justifyContent="flex-end" htmlFor="skip" >
                    Delete secret (caution)
                  </Label>
                  <Button bg={componentBgColor} jc="center" borderColor={borderColor} borderWidth={1.2} size="$3.5" ml="$2" onPress={clearSecretFromStorage}>
                    <VenetianMask color={textColor1} />
                  </Button>
                </Fieldset>

                <YStack flex={1} />

                <YStack mb="$0">
                  {/* <Button p="$2.5" borderRadius="$3" bg={componentBgColor} jc="center" borderColor={borderColor} borderWidth={1.2} onPress={() => setSettingsIsOpen(false)} w="80%" alignSelf='center'>
                    <Text color={textColor1} textAlign='center' fow="bold">Close</Text>
                  </Button> */}
                </YStack>
              </YStack>
            </Sheet.Frame>
          </Sheet>

          <Sheet open={HelpIsOpen} onOpenChange={setHelpIsOpen} dismissOnSnapToBottom modal animation="medium" snapPoints={[88]}>
            <Sheet.Overlay />
            <Sheet.Frame bg={bgColor} borderRadius="$9">
              <YStack px="$3" pb="$5" flex={1} >
                <XStack ml="$2" mt="$3" gap="$2">
                  <H2 color={textColor1}>Help</H2>
                  <HelpCircle color={textColor1} mt="$1" alignSelf='center' size="$2" />
                  <XStack justifyContent="flex-end" f={1} mt="$2" mr="$2" gap="$5">
                    <Pressable onPress={() => Linking.openURL('https://proofofpassport.com')}>
                      <Image
                        source={{ uri: Internet, width: 24, height: 24 }}
                      />
                    </Pressable>
                    <Pressable onPress={() => Linking.openURL('https://t.me/proofofpassport')}>
                      <Image
                        source={{ uri: Telegram, width: 24, height: 24 }}
                      />
                    </Pressable>
                    <Pressable onPress={() => Linking.openURL('https://x.com/proofofpassport')}>
                      <Image
                        source={{ uri: X, width: 24, height: 24 }}
                      />
                    </Pressable>
                    <Pressable onPress={() => Linking.openURL('https://github.com/zk-passport/proof-of-passport')}>
                      <Image
                        tintColor={textColor1}
                        source={{ uri: Github, width: 24, height: 24 }}
                      />
                    </Pressable>
                  </XStack>
                </XStack>
                <YStack flex={1} mt="$3" jc="space-evenly">
                  <YStack >
                    <H3 color={textColor1}>Security and Privacy</H3>
                    <Text color={textColor2} ml="$2" mt="$1">Proof of Passport uses zero-knowledge cryptography to allow you to prove facts about yourself like humanity, nationality or age without disclosing sensitive information.</Text>
                  </YStack>
                  <YStack >
                    <H3 color={textColor1}>About ZK Proofs</H3>
                    <Text color={textColor2} ml="$2" mt="$1">Zero-knowledge proofs rely on mathematical magic tricks to show the validity of some computation without revealing of all its inputs. In our case, the proof shows the passport has not been forged, but allows you to hide sensitive data.</Text>
                  </YStack>
                  <YStack gap="$1">
                    <H3 color={textColor1}>FAQ</H3>
                    <YStack ml="$1">
                      <H4 color={textColor1}>Troubleshoot NFC scanning</H4>
                      <Text color={textColor2} ml="$2" >Refer to <Text onPress={() => Linking.openURL('https://zk-passport.github.io/posts/how-to-scan-your-passport-using-nfc/')} color={blueColorLight} style={{ textDecorationLine: 'underline', fontStyle: 'italic' }}>this tutorial</Text> on how to scan your passport using NFC.</Text>
                    </YStack>
                    <YStack ml="$1">
                      <H4 color={textColor1}>My camera is down</H4>
                      <Text color={textColor2} ml="$2">Go to settings and turn on the broken camera option.</Text>
                    </YStack>
                    <YStack ml="$1">
                      <H4 color={textColor1}>My passport is not supported</H4>
                      <Text color={textColor2} ml="$2">Please contact us on Telegram, or if you have programming skills, you can easily <Text onPress={() => Linking.openURL('https://t.me/proofofpassport')} color={blueColorLight} style={{ textDecorationLine: 'underline', fontStyle: 'italic' }}>contribute</Text> to the project by adding your signature algorithm.</Text>
                    </YStack>
                  </YStack>

                </YStack>
                {/* <Button mt="$3" bg={componentBgColor} jc="center" borderColor={borderColor} borderWidth={1.2} size="$3.5" ml="$2" alignSelf='center' w="80%" onPress={() => setHelpIsOpen(false)}>
                  <Text color={textColor1} w="80%" textAlign='center' fow="bold">Close</Text>
                </Button> */}

              </YStack>
            </Sheet.Frame>
          </Sheet>

          <Sheet open={sheetIsOpen} onOpenChange={setSheetIsOpen} dismissOnSnapToBottom modal animation="medium" snapPoints={[80]}>
            <Sheet.Overlay />
            <Sheet.Frame bg={bgColor} borderRadius="$9" pt="$2">
              <YStack p="$4" f={1} gap="$3">
                <Text fontSize="$6" mb="$4" color={textColor1}>Enter your the information manually</Text>
                <Fieldset gap="$4" horizontal>
                  <Text color={textColor1} width={160} justifyContent="flex-end" fontSize="$4">
                    Passport Number
                  </Text>
                  <Input
                    bg={componentBgColor}
                    color={textColor1}
                    h="$3.5"
                    borderColor={passportNumber?.length === 9 ? "green" : "unset"}
                    flex={1}
                    id="passportnumber"
                    onChangeText={(text) => {
                      update({ passportNumber: text.toUpperCase() })
                    }}
                    value={passportNumber}
                    keyboardType="default"
                  />
                </Fieldset>
                <Fieldset gap="$4" horizontal>
                  <Text color={textColor1} width={160} justifyContent="flex-end" fontSize="$4">
                    Date of birth (yymmdd)
                  </Text>
                  <Input
                    bg={componentBgColor}
                    color={textColor1}
                    h="$3.5"
                    borderColor={dateOfBirth?.length === 6 ? "green" : "unset"}
                    flex={1}
                    id="dateofbirth"
                    onChangeText={(text) => {
                      update({ dateOfBirth: text })
                    }}
                    value={dateOfBirth}
                    keyboardType={Platform.OS === "ios" ? "default" : "number-pad"}
                  />
                </Fieldset>
                <Fieldset gap="$4" horizontal>
                  <Text color={textColor1} width={160} justifyContent="flex-end" fontSize="$4">
                    Date of expiry (yymmdd)
                  </Text>
                  <Input
                    bg={componentBgColor}
                    color={textColor1}
                    h="$3.5"
                    borderColor={dateOfExpiry?.length === 6 ? "green" : "unset"}
                    flex={1}
                    id="dateofexpiry"
                    onChangeText={(text) => {
                      update({ dateOfExpiry: text })
                    }}
                    value={dateOfExpiry}
                    keyboardType={Platform.OS === "ios" ? "default" : "number-pad"}
                  />
                </Fieldset>
              </YStack>
            </Sheet.Frame>
          </Sheet>
          <XStack bc="#343434" h={1.2} />
        </YStack>
        <Tabs f={1} orientation="horizontal" flexDirection="column" defaultValue="scan"
          value={selectedTab}
          onValueChange={(value) => updateNavigationStore({ selectedTab: value })}
        >
          <ToastViewport flexDirection="column-reverse" top={15} right={0} left={0} />
          <ToastMessage />
          <Tabs.Content value="scan" f={1}>
            <CameraScreen
              sheetIsOpen={sheetIsOpen}
              setSheetIsOpen={setSheetIsOpen}
            />
          </Tabs.Content>
          <Tabs.Content value="nfc" f={1}>
            <NfcScreen
              handleNFCScan={handleNFCScan}
            />
          </Tabs.Content>

          <Tabs.Content value="app" f={1}>
            <AppScreen />
          </Tabs.Content>

          <Tabs.Content value="prove" f={1}>
            <ProveScreen />
          </Tabs.Content>
          <Tabs.Content value="mint" f={1}>
            <SendProofScreen />
          </Tabs.Content>
        </Tabs>
      </YStack>
      <Modal visible={showWarningModal.show} animationType="slide" transparent={true}>
        <YStack bc="#161616" p={20} ai="center" jc="center" position="absolute" top={0} bottom={0} left={0} right={0}>
          <YStack bc="#343434" p={20} borderRadius={10} ai="center" jc="center">
            <Text fontWeight="bold" fontSize={18} color="#a0a0a0">👋 Hi</Text>
            <Text mt={10} textAlign="center" color="#a0a0a0">
              The app needs to download a large file ({(showWarningModal.size / 1024 / 1024).toFixed(2)}MB). Please make sure you're connected to a Wi-Fi network before continuing.
            </Text>
            <XStack mt={20}>
              <Button
                onPress={() => {
                  fetchZkey(showWarningModal.circuit as CircuitName);
                  updateNavigationStore({
                    showWarningModal: {
                      show: false,
                      circuit: '',
                      size: 0,
                    }
                  });
                }}
                bc="#4caf50" borderRadius={5} padding={10}
              >
                <Text color="#ffffff">Continue</Text>
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </Modal>
    </>
  );
};

export default MainScreen;
