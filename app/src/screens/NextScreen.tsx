import React from 'react';
import { YStack, XStack, Text, Image, useWindowDimensions, Fieldset } from 'tamagui';
import { ArrowRight, Info } from '@tamagui/lucide-icons';
import { getFirstName, maskString } from '../utils/utils';
import { attributeToPosition } from '../../../common/src/constants/constants';
import USER_PROFILE from '../images/user_profile.png'
import { bgGreen, borderColor, componentBgColor, textBlack, textColor1, textColor2 } from '../utils/colors';
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
    <YStack f={1}>
      <YStack alignSelf='center' my="$3">
        {hideData
          ? <Image
            w={height > 750 ? 150 : 100}
            h={height > 750 ? 190 : 80}
            borderRadius={height > 800 ? "$7" : "$6"}
            source={{
              uri: USER_PROFILE,
            }}
          />
          : <Image
            w={height > 750 ? 190 : 130}
            h={height > 750 ? 190 : 130}
            borderRadius={height > 750 ? "$7" : "$6"}

            source={{
              uri: passportData.mockUser ? USER_PROFILE : passportData.photoBase64 ?? USER_PROFILE,
            }}
          />
        }
      </YStack>
      <Text color={textBlack} fontSize="$9" mt="$8" >
        Hi{" "}
        <Text color={textBlack} fontSize="$9" style={{
          textDecorationLine: "underline", textDecorationColor: bgGreen
        }}>{
            hideData
              ? maskString(getFirstName(passportData.mrz))
              : getFirstName(passportData.mrz)
          }</Text>

      </Text>

      <YStack gap="$2.5" mt="$6">
        {Object.keys(disclosureOptions).map((key) => {
          const key_ = key;
          const indexes = attributeToPosition[key_ as keyof typeof attributeToPosition];
          const keyFormatted = key_.replace(/_/g, ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          const mrzAttribute = passportData.mrz.slice(indexes[0], indexes[1] + 1);
          const mrzAttributeFormatted = formatAttribute(key_, mrzAttribute);

          return (
            <Fieldset horizontal key={key} gap="$3" alignItems='center'>
              <Text color={textBlack} w="$14" justifyContent="flex-end" fontSize="$6" style={{
                opacity: 0.7
              }}>
                {keyFormatted}:
              </Text>
              <Text
                color={textBlack}
                fontSize="$6"

              >
                {hideData ? maskString(mrzAttributeFormatted) : mrzAttributeFormatted}
              </Text>

            </Fieldset>
          );
        })}
      </YStack>

      <YStack f={1} />


      <YStack f={1} />

      <CustomButton onPress={handleNext} text="Next" Icon={<ArrowRight color={textBlack} />} />
    </YStack >
  );
};

export default NextScreen;