import React from 'react';
import { YStack, XStack, Text, Image, useWindowDimensions, Fieldset } from 'tamagui';
import { ArrowRight, Info } from '@tamagui/lucide-icons';
import { getFirstName, maskString } from '../../utils/utils';
import { attributeToPosition } from '../../../common/src/constants/constants';
import USER from '../images/user.png'
import { bgGreen, borderColor, componentBgColor, textBlack, textColor1, textColor2 } from '../utils/colors';
import { Platform } from 'react-native';
import { formatAttribute } from '../utils/utils';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';
import CustomButton from '../components/CustomButton';


const NextScreen: React.FC = () => {

  const { height } = useWindowDimensions();
  const handleNext = () => {
    setRegistered(true);
    setSelectedTab("app");
  }
  const {
    hideData,
    setSelectedTab

  } = useNavigationStore()

  const {
    passportData,
    setRegistered
  } = useUserStore();

  const disclosureOptions: any = {
    gender: "optional",
    nationality: "optional",
    expiry_date: "optional",
    date_of_birth: "optional",
  };

  return (
    <YStack p="$3" f={1} mb={Platform.OS === 'ios' ? "$5" : "$0"}>
      <YStack flex={1} mx="$2" gap="$2" mt="$2">
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
        <Text color={textBlack} fontSize="$8" mt="$8" >
          Hi{" "}
          <Text color={textBlack} fontSize="$8" style={{
            textDecorationLine: "underline", textDecorationColor: bgGreen
          }}>{
              hideData
                ? maskString(getFirstName(passportData.mrz))
                : getFirstName(passportData.mrz)
            }</Text>
          {" "}👋
        </Text>

        <YStack gap="$2" mt="$4" >
          {Object.keys(disclosureOptions).map((key) => {
            const key_ = key;
            const indexes = attributeToPosition[key_ as keyof typeof attributeToPosition];
            const keyFormatted = key_.replace(/_/g, ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            const mrzAttribute = passportData.mrz.slice(indexes[0], indexes[1] + 1);
            const mrzAttributeFormatted = formatAttribute(key_, mrzAttribute);

            return (
              <Fieldset horizontal key={key} gap="$3" alignItems='center'>
                <Text color={textBlack} w="$10" justifyContent="flex-end" fontSize="$5" style={{
                  opacity: 0.7
                }}>
                  {keyFormatted}:
                </Text>
                <Text
                  color={textBlack}
                  fontSize="$5"

                >
                  {hideData ? maskString(mrzAttributeFormatted) : mrzAttributeFormatted}
                </Text>

              </Fieldset>
            );
          })}
        </YStack>

        <YStack f={1} />

        <XStack bg="#ffff" borderRadius={100} py="$2.5" px="$3">
          <Info alignSelf='center' size={24} color={textBlack} />
          <Text ml="$3" pr="$6" fontSize="$3" color={textBlack}>Your information will remain confidential and will not be used or shared without your explicit consent.</Text>
        </XStack>

        <YStack f={1} />

        <CustomButton onPress={handleNext} text="Next" Icon={<ArrowRight color={textBlack} />} />
      </YStack >
    </YStack >
  );
};

export default NextScreen;