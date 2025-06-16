import { useNavigation, useRoute } from '@react-navigation/native';
import { getSKIPEM, initPassportDataParsing, PassportData } from '@selfxyz/common';
import { Check } from '@tamagui/lucide-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Text, YStack } from 'tamagui';

import { PassportEvents } from '../../consts/analytics';
import { storePassportData } from '../../providers/passportDataProvider';
import analytics from '../../utils/analytics';
import { black, slate100, white } from '../../utils/colors';
import { notificationSuccess } from '../../utils/haptic';

const { trackEvent } = analytics();

interface PassportDataInitScreenProps {}

const PassportDataInitScreen: React.FC<PassportDataInitScreenProps> = ({}) => {
  const navigation = useNavigation();
  const route = useRoute();
  const [isProcessing, setIsProcessing] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const initializePassportData = async () => {
      try {
        const { passportData } = route.params as { passportData: PassportData };

        setIsProcessing(true);

        // Initialize passport data parsing
        const env = passportData.mock ? 'staging' : 'production';
        const skiPem = await getSKIPEM(env);
        const parsedPassportData = initPassportDataParsing(passportData, skiPem);
        const passportMetadata = parsedPassportData.passportMetadata!;

        let dscObject;
        try {
          dscObject = { dsc: passportMetadata.dsc };
        } catch (error) {
          console.error('Failed to parse dsc:', error);
          dscObject = {};
        }

        // Track passport parsing success if not mock data
        if (!passportData.mock) {
        trackEvent(PassportEvents.PASSPORT_PARSED, {
          success: true,
          data_groups: passportMetadata.dataGroups,
          dg1_size: passportMetadata.dg1Size,
          dg1_hash_size: passportMetadata.dg1HashSize,
          dg1_hash_function: passportMetadata.dg1HashFunction,
          dg1_hash_offset: passportMetadata.dg1HashOffset,
          dg_padding_bytes: passportMetadata.dgPaddingBytes,
          e_content_size: passportMetadata.eContentSize,
          e_content_hash_function: passportMetadata.eContentHashFunction,
          e_content_hash_offset: passportMetadata.eContentHashOffset,
          signed_attr_size: passportMetadata.signedAttrSize,
          signed_attr_hash_function: passportMetadata.signedAttrHashFunction,
          signature_algorithm: passportMetadata.signatureAlgorithm,
          salt_length: passportMetadata.saltLength,
          curve_or_exponent: passportMetadata.curveOrExponent,
          signature_algorithm_bits: passportMetadata.signatureAlgorithmBits,
          country_code: passportMetadata.countryCode,
          csca_found: passportMetadata.cscaFound,
          csca_hash_function: passportMetadata.cscaHashFunction,
          csca_signature_algorithm: passportMetadata.cscaSignatureAlgorithm,
          csca_salt_length: passportMetadata.cscaSaltLength,
          csca_curve_or_exponent: passportMetadata.cscaCurveOrExponent,
          csca_signature_algorithm_bits: passportMetadata.cscaSignatureAlgorithmBits,
          dsc: dscObject,
          dsc_aki: passportData.dsc_parsed?.authorityKeyIdentifier,
          dsc_ski: passportData.dsc_parsed?.subjectKeyIdentifier,
        });
        }

        // Store passport data
        await storePassportData(parsedPassportData);

        setIsProcessing(false);
        setIsComplete(true);

        // Success haptic feedback
        notificationSuccess();

        // Wait a bit to show the success state, then navigate
        setTimeout(() => {
          (navigation as any).navigate('ConfirmBelongingScreen', {});
        }, 2000);

      } catch (error: any) {
        console.error('Passport Data Initialization Failed:', error);
        trackEvent(PassportEvents.PASSPORT_PARSE_FAILED, {
          error: error.message,
        });

        // Navigate back to scanning screen on error
        navigation.goBack();
      }
    };

    initializePassportData();
  }, [route.params, navigation]);

  return (
    <YStack
      flex={1}
      backgroundColor={slate100}
      alignItems="center"
      justifyContent="center"
      space="$6"
    >
      {isComplete ? (
        <Check size={48} color={black} />
      ) : (
        <ActivityIndicator size="large" color={black} />
      )}
      <Text
        color={black}
        fontSize={18}
        fontWeight="600"
        textAlign="center"
        paddingHorizontal={32}
      >
        {isProcessing
          ? 'Parsing passport data...'
          : 'Passport data stored in your keychain'}
      </Text>
    </YStack>
  );
};

export default PassportDataInitScreen;

const styles = StyleSheet.create({});
