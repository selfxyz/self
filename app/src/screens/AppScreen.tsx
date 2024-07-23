import React from 'react';
import { ScrollView, Text, YStack } from 'tamagui';
import AppCard from '../components/AppCard';
import { Steps } from '../utils/utils';
import useNavigationStore from '../stores/navigationStore';
import { AppType } from '../utils/appType';
import sbtApp from '../apps/sbt';
import zupassApp from '../apps/zupass';
import gitcoinApp from '../apps/gitcoin';
import { XStack } from 'tamagui';
import CustomButton from '../components/CustomButton';
import { BadgeCheck, Binary, LockKeyhole, QrCode, ShieldCheck, Smartphone, UserPlus } from '@tamagui/lucide-icons';
import { bgBlue, bgGreen, separatorColor, textBlack } from '../utils/colors';
import { orange } from '@tamagui/colors';
import useUserStore from '../stores/userStore';

const AppScreen: React.FC = () => {
  const {
    selectedApp,
    update,
    selectedTab,
    setSelectedTab
  } = useNavigationStore();

  const {
    registered,
    setRegistered
  } = useUserStore();

  const handleCardSelect = (app: AppType) => {
    update({
      selectedTab: "prove",
      selectedApp: app,
      step: Steps.APP_SELECTED,
    })
  };

  const cardsData = [
    sbtApp,
    zupassApp,
    gitcoinApp
  ];

  return (
    <YStack f={1} pb="$3" px="$3">
      {/* <XStack h="$0.25" bg={separatorColor} mx="$0" /> */}
      <ScrollView >
        <YStack >
          <Text fontSize="$8" mt="$2" >Account</Text>
          <XStack ml="$2" gap="$2" ai="center">
            <Text fontSize="$5">status:</Text>
            {registered ?
              <XStack bg={bgGreen} px="$2.5" py="$2" borderRadius="$10">
                <Text color={textBlack} fontSize="$4">registered</Text>
              </XStack> :
              <XStack bg={'#FFB897'} px="$2.5" py="$2" borderRadius="$10">
                <Text color={textBlack} fontSize="$4">not registered</Text>
              </XStack>}
          </XStack>
          {/* <XStack ml="$2" gap="$2" mt="$1">
            <Text fontSize="$5">userID:</Text>
            <Text color={textBlack} fontSize="$5">0x1234567890</Text>
          </XStack> */}
        </YStack>
        <YStack>
          <Text mt="$4" fontSize="$8" >How to use Proof of Passport?</Text>
          <YStack>
            <XStack mt="$3" px="$5" gap="$2" >
              <QrCode size={50} color={textBlack} />
              <YStack>
                <Text fontSize="$5" mb="$1">Scan QR code</Text>
                <XStack gap="$2"><Text fontSize="$3">1</Text><Text fontSize="$3" maxWidth={220}>Find the QR code on the page of the app that asks for proof of passport.</Text></XStack>
                <XStack mt="$1" gap="$2"><Text fontSize="$3">2</Text><Text fontSize="$3" maxWidth={220}>Scan the QR code.</Text></XStack>
              </YStack>
            </XStack>
            <XStack mt="$4" px="$5" gap="$2" >
              <BadgeCheck size={50} color={textBlack} />
              <YStack>
                <Text fontSize="$5" mb="$1">Generate a Proof</Text>
                <XStack gap="$2"><Text fontSize="$3">1</Text><Text fontSize="$3" maxWidth={220}>Generate a proof of the selected information.</Text></XStack>
                <XStack mt="$1" gap="$2"><Text fontSize="$3">2</Text><Text fontSize="$3" maxWidth={220}>Share the proof with the application.</Text></XStack>
              </YStack>
            </XStack>
          </YStack>
        </YStack>
        <YStack mb="$4">
          <Text mt="$5" fontSize="$8" >How does it works?</Text>
          <YStack>
            <XStack mt="$3" px="$5" gap="$2" >
              <Binary size={50} color={textBlack} />
              <YStack>
                <Text fontSize="$5" mb="$1">Strong cryptography</Text>
                <XStack gap="$2"><Text fontSize="$3">·</Text><Text fontSize="$3" maxWidth={220}>Proof of Passport uses ZK technologies which allows you to prove a statement without revealing why it's true.</Text></XStack>
                <XStack gap="$2"><Text fontSize="$3">·</Text><Text fontSize="$3" maxWidth={220}>You are always anonymous</Text></XStack>
              </YStack>
            </XStack>
            <XStack mt="$3" px="$5" gap="$2" >
              <Smartphone size={50} color={textBlack} />
              <YStack>
                <Text fontSize="$5" mb="$1">Serverless</Text>
                <XStack gap="$2"><Text fontSize="$3">·</Text><Text fontSize="$3" maxWidth={220}>Proof of Passport will never receive your data and will never know who you are.</Text></XStack>
                <XStack gap="$2"><Text fontSize="$3">·</Text><Text fontSize="$3" maxWidth={220}>Everything is achieved on your device, even the camera and NFC scanning.</Text></XStack>

              </YStack>
            </XStack>
          </YStack>
        </YStack>
      </ScrollView>


      <XStack f={1} minHeight="$1" />
      {registered ? <CustomButton text="Scan QR code" onPress={() => setRegistered(false)} Icon={<QrCode size={18} color={textBlack} />} /> :
        <CustomButton text="Register" onPress={() => { setSelectedTab("start"); setRegistered(true); }} Icon={<UserPlus size={18} color={textBlack} />} />}
      {/* <YStack my="$8" gap="$5" px="$5" jc="center" alignItems='center'>
        {
          cardsData.map(app => (
            <AppCard
              key={app.id}
              title={app.title}
              description={app.description}
              id={app.id}
              onTouchStart={() => handleCardSelect(app)}
              selected={selectedApp && selectedApp.id === app.id ? true : false}
              selectable={app.selectable}
              icon={app.icon}
              tags={app.tags}
            />
          ))
        }
      </YStack> */}
    </YStack>
  );
}

export default AppScreen;
