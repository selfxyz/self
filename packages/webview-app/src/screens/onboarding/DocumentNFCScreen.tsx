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

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

/* Inline CSS keyframes for the pulse animation */
const pulseKeyframes = `
@keyframes nfcPulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}
`;

export const DocumentNFCScreen: React.FC = () => {
  const navigate = useNavigate();
  const bridge = useBridge();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleStartScan = async () => {
    setScanState('scanning');
    setErrorMessage('');

    try {
      await bridge.request(
        'nfc',
        'scan',
        {
          passportNumber: '',
          dateOfBirth: '',
          dateOfExpiry: '',
        },
        60_000,
      );
      setScanState('success');
      navigate('/onboarding/confirm');
    } catch (err: any) {
      const message =
        err?.message ?? 'NFC scan failed. Please try again.';
      setErrorMessage(message);
      setScanState('error');
    }
  };

  const handleRetry = () => {
    setScanState('idle');
    setErrorMessage('');
  };

  const renderTitle = () => {
    switch (scanState) {
      case 'idle':
        return 'Find the RFID chip';
      case 'scanning':
        return 'Ready to scan';
      case 'error':
        return 'Scan failed';
      default:
        return '';
    }
  };

  const renderDescription = () => {
    switch (scanState) {
      case 'idle':
        return 'Place the back of your phone on your passport\u2019s photo page to read the NFC chip.';
      case 'scanning':
        return 'Hold your phone steady on the document. This may take a few seconds\u2026';
      case 'error':
        return errorMessage;
      default:
        return '';
    }
  };

  return (
    <YStack flex={1}>
      {/* Inject keyframe animation */}
      <style dangerouslySetInnerHTML={{ __html: pulseKeyframes }} />

      {/* Top section — black with pulsing NFC icon */}
      <View
        flex={1}
        backgroundColor={black}
        alignItems="center"
        justifyContent="center"
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: scanState === 'error' ? '#DC2626' : '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation:
              scanState === 'scanning'
                ? 'nfcPulse 2s ease-in-out infinite'
                : 'none',
          }}
        >
          <span style={{ fontSize: 48, lineHeight: 1 }}>
            {scanState === 'error' ? '\u2717' : '\u{1F4F6}'}
          </span>
        </div>
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
          {renderTitle()}
        </Text>
        <Text
          fontFamily={dinot}
          fontSize={16}
          color={scanState === 'error' ? '#DC2626' : slate500}
          textAlign="center"
          lineHeight={22}
        >
          {renderDescription()}
        </Text>

        {/* Scanning progress indicator */}
        {scanState === 'scanning' && (
          <View
            height={4}
            backgroundColor="#E2E8F0"
            borderRadius={2}
            overflow="hidden"
          >
            <div
              style={{
                height: '100%',
                width: '60%',
                backgroundColor: '#2563EB',
                borderRadius: 2,
                animation: 'nfcPulse 2s ease-in-out infinite',
              }}
            />
          </View>
        )}

        {/* Primary action button */}
        {scanState === 'idle' && (
          <View
            backgroundColor={black}
            borderRadius={12}
            paddingVertical={14}
            alignItems="center"
            pressStyle={{ opacity: 0.8 }}
            onPress={handleStartScan}
            cursor="pointer"
          >
            <Text fontFamily={dinot} fontSize={16} fontWeight="500" color={amber50}>
              Start Scanning
            </Text>
          </View>
        )}

        {scanState === 'scanning' && (
          <View
            backgroundColor={black}
            borderRadius={12}
            paddingVertical={14}
            alignItems="center"
            opacity={0.6}
          >
            <Text fontFamily={dinot} fontSize={16} fontWeight="500" color={amber50}>
              Scanning...
            </Text>
          </View>
        )}

        {scanState === 'error' && (
          <View
            backgroundColor={black}
            borderRadius={12}
            paddingVertical={14}
            alignItems="center"
            pressStyle={{ opacity: 0.8 }}
            onPress={handleRetry}
            cursor="pointer"
          >
            <Text fontFamily={dinot} fontSize={16} fontWeight="500" color={amber50}>
              Try again
            </Text>
          </View>
        )}

        {/* Cancel / back button */}
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
