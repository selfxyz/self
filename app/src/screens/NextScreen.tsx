import React from 'react';
import { YStack, XStack, Text, Button, Image, useWindowDimensions, Fieldset } from 'tamagui';
import { Info } from '@tamagui/lucide-icons';
import { getFirstName, maskString } from '../../utils/utils';
import { attributeToPosition } from '../../../common/src/constants/constants';
import USER from '../images/user.png'
import { borderColor, componentBgColor, textColor1, textColor2 } from '../utils/colors';
import { Platform } from 'react-native';
import { formatAttribute, Steps } from '../utils/utils';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';


const NextScreen: React.FC = () => {
  const {
    hideData,
    setStep,

  } = useNavigationStore()

  const {
    passportData,
  } = useUserStore();

  const disclosureOptions: any = {
    gender: "optional",
    nationality: "optional",
    expiry_date: "optional",
    date_of_birth: "optional",
  };

  const { height } = useWindowDimensions();

  return (
    <YStack px="$4" f={1} mb={Platform.OS === 'ios' ? "$5" : "$0"}>
      <YStack flex={1} mx="$2" gap="$2">
        <YStack alignSelf='center' my="$3">
          {hideData
            ? <Image
              w={height > 750 ? 150 : 100}
              h={height > 750 ? 190 : 80}
              borderRadius={height > 800 ? "$7" : "$6"}
              source={{
                uri: USER,
              }}
            />
            : <Image
              w={height > 750 ? 150 : 110}
              h={height > 750 ? 190 : 130}
              borderRadius={height > 750 ? "$7" : "$6"}
              source={{
                uri: passportData.photoBase64 ?? USER,
              }}
            />
          }
        </YStack>
        <Text color={textColor1} fontSize="$5" fontWeight="bold">
          Hi {" "}
          {
            hideData
              ? maskString(getFirstName(passportData.mrz))
              : getFirstName(passportData.mrz)
          }
          👋
        </Text>

        <YStack gap="$2.5" mt="$2" ml="$2">
          {Object.keys(disclosureOptions).map((key) => {
            const key_ = key;
            const indexes = attributeToPosition[key_ as keyof typeof attributeToPosition];
            const keyFormatted = key_.replace(/_/g, ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            const mrzAttribute = passportData.mrz.slice(indexes[0], indexes[1] + 1);
            const mrzAttributeFormatted = formatAttribute(key_, mrzAttribute);

            return (
              <Fieldset horizontal key={key} gap="$3" alignItems='center'>
                <Text color={textColor2} w="$10" justifyContent="flex-end"  >
                  {keyFormatted}:
                </Text>
                <Text
                  color={textColor1}
                >
                  {hideData ? maskString(mrzAttributeFormatted) : mrzAttributeFormatted}
                </Text>

              </Fieldset>
            );
          })}
        </YStack>
        <YStack f={1} />

        <XStack mt="$6" bg={componentBgColor} borderRadius={100} borderWidth={1} borderColor={borderColor} py="$2.5" px="$3">
          <Info alignSelf='center' size={24} color={textColor1} />
          <Text ml="$3" pr="$6" fontSize="$3" color={textColor1}>Your information will remain confidential and will not be used or shared without your explicit consent.</Text>
        </XStack>
        <Button
          mt="$8"
          alignSelf='center'
          onPress={() => setStep(Steps.REGISTER)}
          borderWidth={1.3} borderColor={borderColor} borderRadius="$10" bg="#3185FC"
          mb="$6"
          w="100%"
        >
          <Text color="white" fontSize="$5">Next</Text>
        </Button>
      </YStack >
    </YStack >
  );
};

export default NextScreen;