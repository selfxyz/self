import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Button, Tabs, styled, Dialog, Adapt, Sheet, Label, Fieldset, Input, Switch, ThemeableStack } from 'tamagui'
import { Scan, UserCheck, HelpCircle, XCircle, IterationCw, LayoutGrid, Sparkles } from '@tamagui/lucide-icons';
import ScanScreen from './ScanScreen';
import ProveScreen from './ProveScreen';
import { Steps } from '../utils/utils';
import AppScreen from './AppScreen';
import { App } from '../utils/AppClass';


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

  return (
    <YStack f={1} ai="center" jc="space-between" bc="#fff">

      <YStack w="100%">
        <XStack w="100%" jc="space-between" ai="center" ph="$4" pv="$2" bc="#fff" p="$3">
          <XStack></XStack>
          <Text>
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

                <Fieldset gap="$4" mt="$2" horizontal>
                  <Label width={160} justifyContent="flex-end" htmlFor="restart" fow="bold">
                    Restart to step 1
                  </Label>
                  <Button size="$4" m="$2" onPress={handleRestart}>
                    <IterationCw />
                  </Button>
                </Fieldset>


                <Fieldset gap="$4" mt="$2" horizontal>
                  <Label width={160} justifyContent="flex-end" htmlFor="skip" fow="bold">
                    Enter mock passport data
                  </Label>
                  <Button size="$4" m="$2" onPress={handleSkip}>
                    <Sparkles />
                  </Button>
                </Fieldset>

                <Fieldset gap="$4" mt="$2" horizontal>
                  <Label width={160} justifyContent="flex-end" htmlFor="name" fow="bold">
                    Broken camera
                  </Label>
                  <Switch size="$4" checked={brokenCamera} onCheckedChange={setBrokenCamera}>
                    <Switch.Thumb animation="bouncy" backgroundColor="white" color />
                  </Switch>
                </Fieldset>
                {
                  brokenCamera &&
                  <YStack space pl="$3">
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
        <YStack w="100%" h={2} backgroundColor="#DCDCDC" opacity={0.16}></YStack>
      </YStack>


      <Tabs f={1} defaultValue="scan" orientation='horizontal' dir='ltr' shadowColor="black" onValueChange={(newValue) => setSelectedTab(newValue)}>
        <YStack ai="center" jc="space-between" bc="" >
          <XStack flexGrow={0} ai="center" />

          <Tabs.Content value="scan">
            <ScanScreen
              onStartCameraScan={onStartCameraScan}
              nfcScan={nfcScan}
              step={step} />
          </Tabs.Content>
          <Tabs.Content value="app">
            <AppScreen
              selectedApp={selectedApp}
              setSelectedApp={setSelectedApp}
            />
          </Tabs.Content>
          <Tabs.Content value="generate">
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
              totalTime={totalTime}
            />
          </Tabs.Content>

          <YStack w="100%" backgroundColor="white">
            <YStack w="100%" h={2} backgroundColor="#DCDCDC" opacity={0.16}></YStack>

            <Tabs.List w="100%" pt="$4" pb="$3">
              <Tabs.Tab unstyled value="scan" w="33%" backgroundColor="transparent" >
                <YStack ai="center">
                  <Scan color={selectedTab === "scan" ? '#3185FC' : 'black'} />
                  <Text color={selectedTab === "scan" ? '#3185FC' : 'black'}>Scan</Text>
                </YStack>
              </Tabs.Tab>

              {step < Steps.NFC_SCAN_COMPLETED ?
                <Tabs.Tab unstyled value="scan" w="33%" backgroundColor="transparent" >
                  <YStack ai="center">
                    <LayoutGrid color="#eeeeee" />
                    <Text color="#eeeeee">Apps</Text>
                  </YStack>
                </Tabs.Tab>
                :
                <Tabs.Tab unstyled value="app" w="33%" backgroundColor="transparent" >
                  <YStack ai="center">
                    <LayoutGrid color={selectedTab === "app" ? '#3185FC' : 'black'} />
                    <Text color={selectedTab === "app" ? '#3185FC' : 'black'}>Apps</Text>
                  </YStack>
                </Tabs.Tab>
              }



              {selectedApp === null ?
                <Tabs.Tab unstyled value={step < Steps.NFC_SCAN_COMPLETED ? "scan" : "app"} w="33%" backgroundColor="transparent">
                  <YStack ai="center">
                    <UserCheck color="#eeeeee" />
                    <Text color="#eeeeee">Prove</Text>
                  </YStack>
                </Tabs.Tab>
                :
                <Tabs.Tab unstyled value="generate" w="33%" backgroundColor="transparent">
                  <YStack ai="center">
                    <UserCheck color={selectedTab === "generate" ? '#3185FC' : 'black'} />
                    <Text color={selectedTab === "generate" ? '#3185FC' : 'black'}>Prove</Text>
                  </YStack>
                </Tabs.Tab>
              }
            </Tabs.List>
          </YStack>
        </YStack>
      </Tabs >
    </YStack >
  );
};

export default MainScreen;
