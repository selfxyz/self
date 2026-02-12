import React from 'react';
import { Text, View, YStack } from 'tamagui';
import { useNavigate, useLocation } from 'react-router-dom';

const black = '#000000';
const white = '#ffffff';
const amber50 = '#FFFBEB';
const slate300 = '#CBD5E1';
const slate500 = '#64748B';
const dinot = 'DINOT-Medium';

export const VerificationResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as { success?: boolean } | null;
  const success = locationState?.success ?? true;

  return (
    <YStack flex={1}>
      {/* Top section — black with result icon */}
      <View
        flex={1}
        backgroundColor={black}
        alignItems="center"
        justifyContent="center"
      >
        <View
          width={120}
          height={120}
          borderRadius={60}
          backgroundColor={success ? '#22C55E' : '#EF4444'}
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={56} color={white}>
            {success ? '\u2713' : '\u2717'}
          </Text>
        </View>
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
          {success ? 'Verification complete' : 'Verification failed'}
        </Text>
        <Text
          fontFamily={dinot}
          fontSize={16}
          color={slate500}
          textAlign="center"
          lineHeight={22}
        >
          {success
            ? 'Your identity has been verified successfully.'
            : 'Something went wrong. Please try again.'}
        </Text>

        {/* Primary button */}
        <View
          backgroundColor={black}
          borderRadius={12}
          paddingVertical={14}
          alignItems="center"
          pressStyle={{ opacity: 0.8 }}
          onPress={() => navigate('/')}
          cursor="pointer"
        >
          <Text fontFamily={dinot} fontSize={16} fontWeight="500" color={amber50}>
            Done
          </Text>
        </View>

        {/* Secondary button — only shown on failure */}
        {!success && (
          <View
            backgroundColor={white}
            borderRadius={12}
            paddingVertical={14}
            borderWidth={1}
            borderColor={slate300}
            alignItems="center"
            pressStyle={{ opacity: 0.7 }}
            onPress={() => navigate('/proving')}
            cursor="pointer"
          >
            <Text fontFamily={dinot} fontSize={16} fontWeight="500" color={black}>
              Try again
            </Text>
          </View>
        )}
      </YStack>
    </YStack>
  );
};
