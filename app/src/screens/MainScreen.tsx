import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Button, Tabs, styled, Dialog, Adapt, Sheet, Label, Fieldset, Input, Switch, ThemeableStack, Separator } from 'tamagui'
import { Scan, UserCheck, HelpCircle, XCircle, IterationCw, LayoutGrid, Sparkles, VenetianMask } from '@tamagui/lucide-icons';
import ScanScreen from './ScanScreen';
import ProveScreen from './ProveScreen';
import { Steps } from '../utils/utils';
import AppScreen from './AppScreen';
import { App } from '../utils/AppClass';
import { Keyboard } from 'react-native';
import { Platform } from 'react-native';


interface MainScreenProps {
  onStartCameraScan: () => void;
  nfcScan: () => void;
  passportData: any;
  disclosure: boolean;
  handleDisclosureChange: (disclosure: boolean) => void;
  address: string;
  setAddress: (address: string) => void;
  generatingProof: boolean;
  handleProve: () => void;
  step: number;
  mintText: string;
  proof: any;
  proofTime: number;
  handleMint: () => void;
  totalTime: number;
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
  totalTime,
  setStep,
  passportNumber,
  setPassportNumber,
  dateOfBirth,
  setDateOfBirth,
  dateOfExpiry,
  setDateOfExpiry
}) => {

  const [selectedTab, setSelectedTab] = useState("scan");
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [brokenCamera, setBrokenCamera] = useState(false);
  const [open, setOpen] = useState(false)
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
  useEffect(() => {
    // Check if length of each field is correct and move to step MRZ_SCAN_COMPLETED if so
    if (passportNumber?.length === 9 && (dateOfBirth?.length === 6 && dateOfExpiry?.length === 6)) {
      setStep(Steps.MRZ_SCAN_COMPLETED);
    }
  }, [passportNumber, dateOfBirth, dateOfExpiry]);

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
        <XStack jc="space-between" ai="center" p="$2">
          <XStack w="33%" ></XStack>

          <Text w="33%">
            {selectedTab === "scan" ? "Scan" : (selectedTab === "app" ? "Apps" : "Prove")}
          </Text>

          <Dialog
            modal
          >
            <Dialog.Trigger p="$2">
              <HelpCircle />
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
                <XStack  >
                  <Dialog.Title>Settings</Dialog.Title>

                </XStack>

                <Fieldset gap="$4" mt="$6" horizontal>
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

                <Fieldset gap="$4" mt="$2" horizontal>
                  <Label width={205} justifyContent="flex-end" htmlFor="name" fow="bold">
                    Broken camera
                  </Label>
                  <Switch size="$4" checked={brokenCamera} onCheckedChange={setBrokenCamera}>
                    <Switch.Thumb animation="bouncy" backgroundColor="white" color />
                  </Switch>
                </Fieldset>
                {
                  brokenCamera &&
                  <YStack pl="$3">
                    <Fieldset gap="$4" horizontal>
                      <Label width={160} justifyContent="flex-end" htmlFor="name">
                        Passport Number
                      </Label>
                      <Input borderColor={passportNumber?.length === 9 ? "green" : "unset"} flex={1} id="passport_number" onChangeText={(text) => setPassportNumber(text.toUpperCase())} value={passportNumber} keyboardType="default" />
                    </Fieldset>
                    <Fieldset gap="$4" mt="$2" horizontal>
                      <Label width={160} justifyContent="flex-end" htmlFor="name">
                        Date of birth (yymmdd)
                      </Label>
                      <Input borderColor={dateOfBirth?.length === 6 ? "green" : "unset"} flex={1} id="date_of_birth" onChangeText={setDateOfBirth} value={dateOfBirth} keyboardType="numeric" />
                    </Fieldset>
                    <Fieldset gap="$4" mt="$2" horizontal>
                      <Label width={160} justifyContent="flex-end" htmlFor="name">
                        Date of expiry (yymmdd)
                      </Label>
                      <Input borderColor={dateOfExpiry?.length === 6 ? "green" : "unset"} flex={1} id="date_of_expiry" onChangeText={setDateOfExpiry} value={dateOfExpiry} keyboardType="numeric" />
                    </Fieldset>
                  </YStack>
                }
                <YStack flex={1}>
                  <YStack flex={1}></YStack>
                  <Dialog.Close mb="$4" displayWhenAdapted alignSelf='center'>
                    <XCircle size="$3" />
                  </Dialog.Close>

                </YStack>

              </Dialog.Content>
            </Dialog.Portal>
          </Dialog>
        </XStack>
        <Separator />
      </YStack>


      <Tabs f={1} orientation="horizontal" flexDirection="column" defaultValue="scan" onValueChange={setSelectedTab}>
        <Tabs.Content value="scan" f={1}>
          <ScanScreen
            onStartCameraScan={onStartCameraScan}
            nfcScan={nfcScan}
            step={step} />
        </Tabs.Content>

        <Tabs.Content value="app" f={1}>
          <AppScreen
            selectedApp={selectedApp}
            setSelectedApp={setSelectedApp} />
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
            totalTime={totalTime} />
        </Tabs.Content>

        <Separator />

        {!keyboardVisible ? <Tabs.List separator={<Separator vertical />} pt="$4" pb="$3">

          <Tabs.Tab value="scan" unstyled w="33%">
            <YStack ai="center">
              <Scan color={selectedTab === "scan" ? '#3185FC' : 'black'} />
              <Text color={selectedTab === "scan" ? '#3185FC' : 'black'}>Scan</Text>
            </YStack>
          </Tabs.Tab>

          <Tabs.Tab value="app" unstyled w="33%">
            <YStack ai="center">
              <LayoutGrid color={selectedTab === "app" ? '#3185FC' : 'black'} />
              <Text color={selectedTab === "app" ? '#3185FC' : 'black'}>Apps</Text>
            </YStack>
          </Tabs.Tab>

          <Tabs.Tab value="generate" unstyled w="33%">
            <YStack ai="center">
              <UserCheck color={selectedTab === "generate" ? '#3185FC' : 'black'} />
              <Text color={selectedTab === "generate" ? '#3185FC' : 'black'}>Prove</Text>
            </YStack>
          </Tabs.Tab>

        </Tabs.List> : (<XStack />)}
      </Tabs>

      {/*

      // This component is WIP in case tamagui can't afford to deliver Tabs component without error on time

      <XStack justifyContent='space-between'>

        <Button h="$5" w="33%" unstyled bg="blue" jc='center' ai='center'>
          <YStack>
            <Scan color='black' mt={3} />
            <Text>Scan</Text>
          </YStack>
        </Button>
        <Button h="$5" w="33%" unstyled bg="blue" jc='center' ai='center'>
          <YStack>
            <Scan color='black' mt={3} />
            <Text>Scan</Text>
          </YStack>
        </Button>
        <Button h="$5" w="33%" unstyled bg="blue" jc='center' ai='center'>
          <YStack>
            <Scan color='black' mt={3} />
            <Text>Scan</Text>
          </YStack>
        </Button>
      </XStack>
            */}


    </YStack >
  );
};

export default MainScreen;
