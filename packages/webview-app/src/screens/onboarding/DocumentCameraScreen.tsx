import React, { useState } from 'react';
import { Text, View, YStack } from 'tamagui';
import { useNavigate } from 'react-router-dom';

import { useBridge } from '../../providers/BridgeProvider';

const black = '#000000';
const white = '#ffffff';
const amber50 = '#FFFBEB';
const slate300 = '#CBD5E1';
const slate500 = '#64748B';
const dinot = 'DINOT-Medium';

export const DocumentCameraScreen: React.FC = () => {
  const navigate = useNavigate();
  const bridge = useBridge();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenCamera = async () => {
    setScanning(true);
    setError(null);

    try {
      await bridge.request('camera', 'scanMRZ', {});
      navigate('/onboarding/nfc');
    } catch (err: any) {
      const message =
        err?.message ?? 'Failed to scan document. Please try again.';
      setError(message);
      setScanning(false);
    }
  };

  return (
    <YStack flex={1}>
      {/* Top section — black camera area */}
      <View
        flex={1}
        backgroundColor={black}
        alignItems="center"
        justifyContent="center"
        gap={16}
      >
        <Text fontSize={64} color={white}>
          {'\u{1F4F7}'}
        </Text>
        <Text
          fontFamily={dinot}
          fontSize={14}
          color={white}
          opacity={0.8}
          textAlign="center"
        >
          Position your document
        </Text>
      </View>

      {/* Bottom section — white content */}
      <YStack
        backgroundColor={white}
        padding={24}
        borderTopLeftRadius={24}
        borderTopRightRadius={24}
        gap={16}
        marginTop={-24}
        zIndex={1}
      >
        <Text
          fontFamily={dinot}
          fontSize={24}
          fontWeight="500"
          color={black}
          textAlign="center"
        >
          Scan your document
        </Text>
        <Text
          fontFamily={dinot}
          fontSize={16}
          color={slate500}
          textAlign="center"
          lineHeight={22}
        >
          Place the photo page of your document within the frame
        </Text>

        {error && (
          <View
            backgroundColor="#FEF2F2"
            borderRadius={12}
            padding={12}
          >
            <Text
              fontFamily={dinot}
              fontSize={14}
              color="#DC2626"
              textAlign="center"
            >
              {error}
            </Text>
          </View>
        )}

        {/* Open Camera button */}
        <View
          backgroundColor={black}
          borderRadius={12}
          paddingVertical={14}
          alignItems="center"
          opacity={scanning ? 0.6 : 1}
          pressStyle={{ opacity: 0.8 }}
          onPress={scanning ? undefined : handleOpenCamera}
          cursor={scanning ? 'default' : 'pointer'}
        >
          <Text fontFamily={dinot} fontSize={16} fontWeight="500" color={amber50}>
            {scanning ? 'Scanning...' : 'Open Camera'}
          </Text>
        </View>

        {/* Cancel button */}
        <View
          backgroundColor={white}
          borderRadius={12}
          paddingVertical={14}
          borderWidth={1}
          borderColor={slate300}
          alignItems="center"
          pressStyle={{ opacity: 0.7 }}
          onPress={() => navigate(-1 as any)}
          cursor="pointer"
        >
          <Text fontFamily={dinot} fontSize={16} fontWeight="500" color={black}>
            Cancel
          </Text>
        </View>
      </YStack>
    </YStack>
  );
};
