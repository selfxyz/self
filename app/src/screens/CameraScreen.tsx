import React, { useState } from 'react';
import { YStack, XStack, Button, Image, ScrollView, Sheet, Fieldset, Text, Input } from 'tamagui';
import { Camera, ExternalLink, Nfc, X, SquarePen } from '@tamagui/lucide-icons';
import { bgColor, blueColorDark, blueColorLight, borderColor, componentBgColor, componentBgColor2, greenColorDark, greenColorLight, redColorDark, redColorLight, textColor1, textColor2 } from '../utils/colors';
import SCANHelp from '../images/scan_help.png'
import { startCameraScan } from '../utils/cameraScanner';
import { Platform } from 'react-native';
import useUserStore from '../stores/userStore';

const CameraScreen: React.FC = () => {
  const [sheetIsOpen, setSheetIsOpen] = useState(false);

  const {
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
    deleteMrzFields,
    update,
    clearPassportDataFromStorage,
    clearSecretFromStorage,
  } = useUserStore()

  return (
    <YStack f={1} p="$3">
      <YStack f={1} jc="center">
        <Image borderRadius="$5"
          w="full"
          h="$13"
          source={{ uri: SCANHelp }}
        />
        <YStack gap="$0.5" mt="$3.5">
          <Text mt="$1" color={textColor1}>Use your camera to scan the main page of your passport.</Text>
          <Text fontSize="$2" color={textColor2}>You can also enter those data manually.</Text>
          <Text fontSize="$2" style={{ fontStyle: 'italic' }} color={textColor2}>The app does not take a picture of your passport, it only reads some fields.</Text>
        </YStack>

      </YStack>

      <YStack gap="$2">
        <Button borderWidth={1.3} borderColor={borderColor} borderRadius="$10" bg="#3185FC" onPress={startCameraScan}><Camera color={textColor1} /></Button>
        <Button bg={textColor2} borderColor={borderColor} borderRadius="$10" onPress={() => setSheetIsOpen(true)}><SquarePen /></Button>
      </YStack>


      <Sheet open={sheetIsOpen} onOpenChange={setSheetIsOpen} modal dismissOnOverlayPress={true} animation="medium" snapPoints={[35]}>
        <Sheet.Overlay />
        <Sheet.Frame>
          <YStack p="$4" f={1} bg={bgColor} pl="$3" gap="$3" borderColor="white" >
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
    </YStack >
  );
};

export default CameraScreen;
