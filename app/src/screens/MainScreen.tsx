import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Button, Tabs, styled, Dialog, Adapt, Sheet, Label, Fieldset, Input, Switch, ThemeableStack, Separator, H3, H2, Image } from 'tamagui'
import { Scan, UserCheck, HelpCircle, IterationCw, LayoutGrid, VenetianMask, Cog, CheckCircle2 } from '@tamagui/lucide-icons';
import ScanScreen from './ScanScreen';
import ProveScreen from './ProveScreen';
import { Steps } from '../utils/utils';
import AppScreen from './AppScreen';
import { App } from '../utils/AppClass';
import { Platform } from 'react-native';
import { Keyboard } from 'react-native';
import NFC_IMAGE from '../images/nfc.png'


interface MainScreenProps {
  onStartCameraScan: () => void;
  nfcScan: () => void;
  passportData: any;
  disclosure: { [key: string]: boolean };
  handleDisclosureChange: (field: string) => void;
  address: string;
  setAddress: (address: string) => void;
  generatingProof: boolean;
  handleProve: () => void;
  step: number;
  mintText: string;
  proof: any;
  proofTime: number;
  handleMint: () => void;
  setStep: (step: number) => void;
  passportNumber: string;
  setPassportNumber: (number: string) => void;
  dateOfBirth: string;
  setDateOfBirth: (date: string) => void;
  dateOfExpiry: string;
  setDateOfExpiry: (date: string) => void;
}

const MainScreen: React.FC<MainScreenProps> = ({
  onStartCameraScan,
  nfcScan,
  passportData,
  disclosure,
  handleDisclosureChange,
  address,
  setAddress,
  generatingProof,
  handleProve,
  step,
  mintText,
  proof,
  proofTime,
  handleMint,
  setStep,
  passportNumber,
  setPassportNumber,
  dateOfBirth,
  setDateOfBirth,
  dateOfExpiry,
  setDateOfExpiry
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [ens, setEns] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState("scan");
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [brokenCamera, setBrokenCamera] = useState(false);
  const [hideData, setHideData] = useState(false);
  const [open, setOpen] = useState(true)
  const AppCard = styled(ThemeableStack, {
    hoverTheme: true,
    pressTheme: true,
    focusTheme: true,
    elevate: true
  })
  const handleRestart = () => {
    setStep(Steps.MRZ_SCAN);
    setSelectedApp(null)
    setPassportNumber("");
    setDateOfBirth("");
    setDateOfExpiry("");

  }
  const handleSkip = () => {
    setStep(Steps.NFC_SCAN_COMPLETED);
    setPassportNumber("");
    setDateOfBirth("");
    setDateOfExpiry("");

  }
  const handleHideData = () => {
    setHideData(!hideData);
  }
  const handleNFCScan = () => {
    if ((Platform.OS === 'ios')) {
      console.log('ios');
      nfcScan();
    }
    else {
      console.log('android :)');
      setIsOpen(true);
      nfcScan();
    }
  }
  useEffect(() => {
    if (passportNumber?.length === 9 && (dateOfBirth?.length === 6 && dateOfExpiry?.length === 6)) {
      setStep(Steps.MRZ_SCAN_COMPLETED);
    }
  }, [passportNumber, dateOfBirth, dateOfExpiry]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (step >= Steps.NFC_SCAN_COMPLETED) {
      // Set the timeout and store its ID
      timeoutId = setTimeout(() => {
        setIsOpen(false);
      }, 700);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [step]);

  // Keyboard management

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);


  return (
    <YStack f={1} bc="white" mt={Platform.OS === 'ios' ? "$8" : "$0"} mb={Platform.OS === 'ios' ? "$3" : "$0"}>

      <YStack >
        <XStack jc="space-between" ai="center" p="$2" px="$3">
          <Dialog
            modal
          >
            <Dialog.Trigger >
              <YStack p="$2" pr="$7">
                <Cog />
              </YStack>
            </Dialog.Trigger>

            <Adapt when="sm" platform="touch">
              <Sheet animation="medium" zIndex={200000} modal dismissOnSnapToBottom>
                <Sheet.Frame padding="$4" gap="$4">
                  <Adapt.Contents />
                </Sheet.Frame>
                <Sheet.Overlay
                  animation="lazy"
                  enterStyle={{ opacity: 0 }}
                  exitStyle={{ opacity: 0 }}
                />
              </Sheet>
            </Adapt>

            <Dialog.Portal>
              <Dialog.Overlay
                key="overlay"
                animation="quick"
                opacity={0.5}
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
              />

              <Dialog.Content
                bordered
                elevate
                key="content"
                animateOnly={['transform', 'opacity']}
                animation={[
                  'quick',
                  {
                    opacity: {
                      overshootClamping: true,
                    },
                  },
                ]}
                enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
                exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}

              >
                <YStack f={1} gap="$2">
                  <XStack gap="$2" >
                    <Dialog.Title>Settings</Dialog.Title>
                    <Cog mt="$1" alignSelf='center' size="$2" />

                  </XStack>



                  <Fieldset mt="$2" horizontal>
                    <Label width={225} justifyContent="flex-end" htmlFor="restart" fow="bold">
                      Private mode
                    </Label>
                    <Switch size="$4" checked={hideData} onCheckedChange={handleHideData}>
                      <Switch.Thumb animation="bouncy" backgroundColor="white" />
                    </Switch>
                  </Fieldset>

                  <Fieldset mt="$1" horizontal>
                    <Label width={225} justifyContent="flex-end" htmlFor="name" fow="bold">
                      Broken camera
                    </Label>
                    <Switch size="$4" checked={brokenCamera} onCheckedChange={setBrokenCamera}>
                      <Switch.Thumb animation="bouncy" backgroundColor="white" />
                    </Switch>
                  </Fieldset>
                  {
                    brokenCamera &&
                    <YStack pl="$3" gap="$3" mt="$4">
                      <Fieldset gap="$4" horizontal>
                        <Label width={160} justifyContent="flex-end" fontSize={13}>
                          Passport Number
                        </Label>
                        <Input borderColor={passportNumber?.length === 9 ? "green" : "unset"} flex={1} id="passport_number" onChangeText={(text) => setPassportNumber(text.toUpperCase())} value={passportNumber} keyboardType="default" />
                      </Fieldset>
                      <Fieldset gap="$4" horizontal>
                        <Label width={160} justifyContent="flex-end" fontSize={13}>
                          Date of birth (yymmdd)
                        </Label>
                        <Input borderColor={dateOfBirth?.length === 6 ? "green" : "unset"} flex={1} id="date_of_birth" onChangeText={setDateOfBirth} value={dateOfBirth} keyboardType="numeric" />
                      </Fieldset>
                      <Fieldset gap="$4" horizontal>
                        <Label width={160} justifyContent="flex-end" fontSize={13}>
                          Date of expiry (yymmdd)
                        </Label>
                        <Input borderColor={dateOfExpiry?.length === 6 ? "green" : "unset"} flex={1} id="date_of_expiry" onChangeText={setDateOfExpiry} value={dateOfExpiry} keyboardType="numeric" />
                      </Fieldset>
                    </YStack>
                  }
                  <Fieldset gap="$4" mt="$3" horizontal>
                    <Label width={200} justifyContent="flex-end" htmlFor="restart" fow="bold">
                      Restart to step 1
                    </Label>
                    <Button size="$4" m="$2" onPress={handleRestart}>
                      <IterationCw />
                    </Button>
                  </Fieldset>

                  <Fieldset gap="$4" mt="$2" horizontal>
                    <Label width={200} justifyContent="flex-end" htmlFor="skip" fow="bold">
                      Use mock passport data
                    </Label>
                    <Button size="$4" m="$2" onPress={handleSkip}>
                      <VenetianMask />
                    </Button>
                  </Fieldset>
                  <YStack flex={1}>
                    <YStack flex={1} />
                    <Dialog.Close mb="$6" displayWhenAdapted alignSelf='center' asChild >
                      <Button>
                        <Text w="80%" textAlign='center' fow="bold">Close</Text>
                      </Button>
                    </Dialog.Close>
                  </YStack>
                </YStack>

              </Dialog.Content>
            </Dialog.Portal>
          </Dialog>



          <Text fow="bold">
            {selectedTab === "scan" ? "Scan" : (selectedTab === "app" ? "Apps" : "Prove")}
          </Text>

          <Dialog
            modal
          >
            <Dialog.Trigger>
              <YStack p="$2" pl="$8">
                <HelpCircle />
              </YStack>
            </Dialog.Trigger>

            <Adapt when="sm" platform="touch">
              <Sheet animation="medium" zIndex={200000} modal dismissOnSnapToBottom>
                <Sheet.Frame padding="$4" gap="$4">
                  <Adapt.Contents />
                </Sheet.Frame>
                <Sheet.Overlay
                  animation="lazy"
                  enterStyle={{ opacity: 0 }}
                  exitStyle={{ opacity: 0 }}
                />
              </Sheet>
            </Adapt>

            <Dialog.Portal>
              <Dialog.Overlay
                key="overlay"
                animation="quick"
                opacity={0.5}
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
              />

              <Dialog.Content
                bordered
                elevate
                key="content"
                animateOnly={['transform', 'opacity']}
                animation={[
                  'quick',
                  {
                    opacity: {
                      overshootClamping: true,
                    },
                  },
                ]}
                enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
                exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
                gap="$4"
              >
                <YStack flex={1}>
                  <XStack gap="$2">
                    <Dialog.Title>Help</Dialog.Title>
                    <HelpCircle mt="$1" alignSelf='center' size="$2" />
                  </XStack>
                  <H3 fontFamily="Luciole" mt="$3">How to scan your passport ?</H3>
                  <YStack>
                    <Text>1. Find the location of the NFC chip of your passport.</Text>
                    <Text>If you are struggling <Text color="#3185FC">this post</Text> will help you to find it.</Text>
                    <Text mt="$2">2. Find where is the NFC lector of your phone.</Text>
                    <Text mt="$2">3. Keep both part pressed together when this app ask for it.</Text>
                  </YStack>
                  <H3 mt="$3">Security and User data Privacy</H3>
                  <YStack gap="$2">
                    <Text>This app gerates ZK proofs to ...</Text>
                  </YStack>
                  <H3 mt="$3">What are ZK proofs ?</H3>
                  <YStack gap="$2">
                    <Text>Zero Knowledge proofs are .....</Text>
                  </YStack>

                  <H3 mt="$3">Contacts</H3>
                  <YStack gap="$2">
                    <Text>telegram</Text>
                  </YStack>

                  <H3 mt="$3">Credits</H3>
                  <YStack >
                    <Text>Ethereum Foundation</Text>
                    <Text>turboblitz.eth</Text>
                    <Text>???.eth</Text>
                  </YStack>

                  <YStack flex={1}></YStack>
                  <Dialog.Close displayWhenAdapted alignSelf='center' asChild >
                    <Button>
                      <Text w="80%" textAlign='center' fow="bold">Close</Text>
                    </Button>
                  </Dialog.Close>
                  <YStack flex={1}></YStack>


                </YStack>

              </Dialog.Content>
            </Dialog.Portal>
          </Dialog>
        </XStack>
        <Sheet open={isOpen} onOpenChange={setIsOpen} modal dismissOnOverlayPress={false} disableDrag animation="medium" snapPoints={[40]}>
          <Sheet.Overlay />
          <Sheet.Handle />
          <Sheet.Frame>
            <YStack gap="$5" f={1} pt="$3">
              <H2 textAlign='center' color="gray">Ready to scan</H2>
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
              <Text textAlign='center'>Hold your device near the NFC tag.</Text>
              <Button my="$2" w="$20" alignSelf='center' onPress={() => setIsOpen(false)}>
                <Text textAlign='center' fow="bold"> Cancel</Text>
              </Button>
            </YStack>
          </Sheet.Frame>
        </Sheet>
        <Separator />
      </YStack>
      <Tabs f={1} orientation="horizontal" flexDirection="column" defaultValue="scan" onValueChange={setSelectedTab}>
        <Tabs.Content value="scan" f={1}>
          <ScanScreen
            onStartCameraScan={onStartCameraScan}
            handleNFCScan={handleNFCScan}
            step={step} />
        </Tabs.Content>

        <Tabs.Content value="app" f={1}>
          <AppScreen
            selectedApp={selectedApp}
            setSelectedApp={setSelectedApp}
            step={step}
            setStep={setStep}
          />
        </Tabs.Content>

        <Tabs.Content value="generate" f={1}>
          <ProveScreen
            passportData={passportData}
            disclosure={disclosure}
            selectedApp={selectedApp}
            handleDisclosureChange={handleDisclosureChange}
            address={address}
            setAddress={setAddress}
            generatingProof={generatingProof}
            handleProve={handleProve}
            step={step}
            mintText={mintText}
            proof={proof}
            proofTime={proofTime}
            handleMint={handleMint}
            hideData={hideData}
            ens={ens}
            setEns={setEns} />
        </Tabs.Content>
        <Separator />
        {(!keyboardVisible || Platform.OS == "ios") &&
          <Tabs.List separator={<Separator vertical />} pt="$4" pb="$3">
            <Tabs.Tab value="scan" unstyled w="33%">
              <YStack ai="center">
                <Scan color={selectedTab === "scan" ? '#3185FC' : 'black'} />
                <Text color={selectedTab === "scan" ? '#3185FC' : 'black'}>Scan</Text>
              </YStack>
            </Tabs.Tab>
            {step >= Steps.NFC_SCAN_COMPLETED ?
              <Tabs.Tab value="app" unstyled w="33%">
                <YStack ai="center">
                  <LayoutGrid color={selectedTab === "app" ? '#3185FC' : 'black'} />
                  <Text color={selectedTab === "app" ? '#3185FC' : 'black'}>Apps</Text>
                </YStack>
              </Tabs.Tab>
              :
              <Tabs.Tab value="scan" unstyled w="33%">
                <YStack ai="center">
                  <LayoutGrid color="#bcbcbc" />
                  <Text color="#bcbcbc">Apps</Text>
                </YStack>
              </Tabs.Tab>

            }
            {
              (step >= Steps.NFC_SCAN_COMPLETED) && (selectedApp != null) ?
                <Tabs.Tab value="generate" unstyled w="33%">
                  <YStack ai="center">
                    <UserCheck color={selectedTab === "generate" ? '#3185FC' : 'black'} />
                    <Text color={selectedTab === "generate" ? '#3185FC' : 'black'}>Prove</Text>
                  </YStack>
                </Tabs.Tab>
                :
                <Tabs.Tab value={step >= Steps.NFC_SCAN_COMPLETED ? "app" : "scan"} unstyled w="33%">
                  <YStack ai="center">
                    <UserCheck color="#bcbcbc" />
                    <Text color="#bcbcbc">Prove</Text>
                  </YStack>
                </Tabs.Tab>
            }
          </Tabs.List>

        }
      </Tabs>
    </YStack >
  );
};

export default MainScreen;
