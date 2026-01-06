// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useRef, useState } from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Text, View, YStack } from 'tamagui';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';

import {
  PrimaryButton,
  SecondaryButton,
} from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  green500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { advercase, dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import StarfallBackground from '@/assets/images/bg_starfall_push.png';
import { StarfallLogoHeader } from '@/components/starfall/StarfallLogoHeader';
import { StarfallPIN } from '@/components/starfall/StarfallPIN';
import { confirmTap } from '@/integrations/haptics';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { getOrGeneratePointsAddress } from '@/providers/authProvider';
import { fetchPushCode } from '@/services/starfall/pushCodeService';

const DASH_CODE = '----';

const StarfallPushCodeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [code, setCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFetchCode = async () => {
    try {
      setIsLoading(true);
      setError(null);
      confirmTap();

      const walletAddress = await getOrGeneratePointsAddress();
      const fetchedCode = await fetchPushCode(walletAddress);

      setCode(fetchedCode);
    } catch (err) {
      console.error('Failed to fetch push code:', err);
      setError('Failed to generate code. Please try again.');
      setCode(null); // Clear stale code on error
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleRetry = () => {
    handleFetchCode();
  };

  const handleCopyCode = async () => {
    if (!code || code === DASH_CODE) {
      return;
    }

    try {
      confirmTap();
      await Clipboard.setString(code);
      setIsCopied(true);

      // Clear any existing timeout before creating a new one
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      // Reset after 1.65 seconds
      copyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        copyTimeoutRef.current = null;
      }, 1650);
    } catch (copyError) {
      console.error('Failed to copy to clipboard:', copyError);
    }
  };

  const handleDismiss = () => {
    confirmTap();
    navigation.goBack();
  };

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        {/* Colorful background image */}
        <ImageBackground
          source={StarfallBackground}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        >
          {/* Fade to black overlay - stronger at bottom */}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.6)', black]}
            locations={[0.1, 0.45, 0.6]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        {/* Content container */}
        <YStack flex={1} justifyContent="center" alignItems="center">
          {/* App logos section */}
          <StarfallLogoHeader />

          {/* Title and content */}
          <YStack
            paddingHorizontal={20}
            paddingVertical={20}
            gap={12}
            alignItems="center"
            width="100%"
          >
            <Text
              fontFamily={advercase}
              fontSize={28}
              fontWeight="400"
              color={white}
              textAlign="center"
              letterSpacing={1}
            >
              Your Starfall code awaits
            </Text>

            <YStack gap={16} width="100%" alignItems="center">
              <View paddingHorizontal={40} width="100%">
                <Text
                  fontFamily={dinot}
                  fontSize={14}
                  fontWeight="500"
                  color={white}
                  textAlign="center"
                >
                  Open Starfall in Opera MiniPay and enter this four digit code
                  to continue your journey.
                </Text>
              </View>

              <View width="100%">
                <StarfallPIN
                  code={
                    code === null || isLoading || error !== null
                      ? DASH_CODE
                      : code
                  }
                />
              </View>

              {/* Error message */}
              {error && (
                <Text
                  fontFamily={dinot}
                  fontSize={14}
                  fontWeight="500"
                  color="#ef4444"
                  textAlign="center"
                >
                  {error}
                </Text>
              )}
            </YStack>
          </YStack>
        </YStack>
      </ExpandableBottomLayout.TopSection>

      <ExpandableBottomLayout.BottomSection
        backgroundColor={black}
        style={{ backgroundColor: black }}
      >
        {/* Bottom buttons */}
        <YStack gap={10} width="100%">
          {/* Debug: Fetch code button or Retry button on error */}
          {error ? (
            <PrimaryButton
              onPress={handleRetry}
              disabled={isLoading}
              fontSize={16}
              style={{
                borderColor: '#374151',
                borderWidth: 1,
                borderRadius: 60,
                height: 46,
                paddingVertical: 0,
              }}
            >
              Retry
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onPress={handleFetchCode}
              disabled={isLoading}
              fontSize={16}
              style={{
                borderColor: '#374151',
                borderWidth: 1,
                borderRadius: 60,
                height: 46,
                paddingVertical: 0,
              }}
            >
              {isLoading ? 'Fetching...' : 'Fetch code'}
            </PrimaryButton>
          )}

          <PrimaryButton
            onPress={handleCopyCode}
            disabled={isCopied || !code || code === DASH_CODE || isLoading}
            fontSize={16}
            style={{
              backgroundColor: isCopied ? green500 : undefined,
              borderColor: '#374151',
              borderWidth: 1,
              borderRadius: 60,
              height: 46,
              paddingVertical: 0,
            }}
          >
            {isCopied ? 'Code copied!' : 'Copy code'}
          </PrimaryButton>
          <SecondaryButton
            onPress={handleDismiss}
            textColor={black}
            fontSize={16}
            style={{ borderRadius: 60, height: 46, paddingVertical: 0 }}
          >
            Dismiss
          </SecondaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default StarfallPushCodeScreen;
