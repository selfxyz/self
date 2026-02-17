// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, TextInput } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { Button, Text, XStack, YStack } from 'tamagui';
import { SUMSUB_TEE_URL } from '@env';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from '@tamagui/lucide-icons/icons/ChevronLeft';

import {
  green500,
  red500,
  slate200,
  slate400,
  slate500,
  slate600,
  slate800,
  white,
  yellow500,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import {
  fetchAccessToken,
  launchSumsub,
  type SumsubApplicantInfo,
  type SumsubResult,
} from '@/integrations/sumsub';

const SumsubTestScreen: React.FC = () => {
  const navigation = useNavigation();
  const [phoneNumber, setPhoneNumber] = useState('+11234567890');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sdkLaunching, setSdkLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SumsubResult | null>(null);
  const [applicantInfo, setApplicantInfo] =
    useState<SumsubApplicantInfo | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const hasSubscribedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  const paddingBottom = useSafeBottomPadding(20);

  const handleFetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAccessToken(null);
    setUserId(null);
    setResult(null);

    try {
      const response = await fetchAccessToken();
      if (!isMountedRef.current) return;
      setAccessToken(response.token);
      setUserId(response.userId);
      Alert.alert('Success', 'Access token generated successfully', [
        { text: 'OK' },
      ]);
    } catch (err) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      Alert.alert('Error', `Failed to fetch access token: ${message}`, [
        { text: 'OK' },
      ]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const subscribeToWebSocket = useCallback(() => {
    if (!userId || hasSubscribedRef.current) {
      return;
    }

    // Close any existing socket before creating a new one
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    hasSubscribedRef.current = true;
    if (__DEV__) {
      console.log('Connecting to WebSocket:', SUMSUB_TEE_URL);
    }
    const socket = io(SUMSUB_TEE_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (__DEV__) {
        console.log('Socket connected, subscribing to user');
      }
      socket.emit('subscribe', userId);
    });

    socket.on('connect_error', (err: Error) => {
      if (__DEV__) {
        console.error('Socket connect_error:', err.message);
      }
      if (!isMountedRef.current) return;
      setError(`Connection failed: ${err.message}`);
      hasSubscribedRef.current = false;
    });

    socket.on('success', (data: SumsubApplicantInfo) => {
      if (__DEV__) {
        console.log('Received applicant info');
      }
      if (!isMountedRef.current) return;
      setApplicantInfo(data);
      Alert.alert(
        'Verification Complete',
        'Your verification was successful!',
        [{ text: 'OK' }],
      );
    });

    socket.on('verification_failed', (reason: string) => {
      if (__DEV__) {
        console.log('Verification failed:', reason);
      }
      if (!isMountedRef.current) return;
      setError(`Verification failed: ${reason}`);
      Alert.alert('Verification Failed', reason, [{ text: 'OK' }]);
    });

    socket.on('error', (errorMessage: string) => {
      if (__DEV__) {
        console.error('Socket error:', errorMessage);
      }
      if (!isMountedRef.current) return;
      setError(errorMessage);
      hasSubscribedRef.current = false;
    });

    socket.on('disconnect', () => {
      if (__DEV__) {
        console.log('Socket disconnected');
      }
      hasSubscribedRef.current = false;
    });
  }, [userId]);

  const handleLaunchSumsub = useCallback(async () => {
    if (!accessToken) {
      Alert.alert(
        'Error',
        'No access token available. Please generate one first.',
        [{ text: 'OK' }],
      );
      return;
    }

    setSdkLaunching(true);
    setResult(null);
    setError(null);

    try {
      const sdkResult = await launchSumsub({
        accessToken,
        debug: true,
        locale: 'en',
        onEvent: (eventType, _payload) => {
          console.log('SDK Event:', eventType);
          // Subscribe to WebSocket when verification is completed
          if (eventType === 'idCheck.onApplicantVerificationCompleted') {
            subscribeToWebSocket();
          }
        },
      });

      if (!isMountedRef.current) return;
      setResult(sdkResult);

      if (sdkResult.success) {
        Alert.alert(
          'SDK Closed',
          `Sumsub SDK closed with status: ${sdkResult.status}`,
          [{ text: 'OK' }],
        );
      } else {
        Alert.alert(
          'Error',
          `Sumsub failed: ${sdkResult.errorMsg || sdkResult.errorType || 'Unknown error'}`,
          [{ text: 'OK' }],
        );
      }
    } catch (err) {
      console.error('Sumsub launch error:', err);
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      Alert.alert('Error', `Failed to launch Sumsub SDK: ${message}`, [
        { text: 'OK' },
      ]);
    } finally {
      if (isMountedRef.current) {
        setSdkLaunching(false);
      }
    }
  }, [accessToken, subscribeToWebSocket]);

  const handleReset = useCallback(() => {
    setApplicantInfo(null);
    setAccessToken(null);
    setUserId(null);
    setResult(null);
    setError(null);
    hasSubscribedRef.current = false;
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        hasSubscribedRef.current = false;
      }
    };
  }, []);

  // If we have applicant info, show that
  if (applicantInfo) {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack
          gap="$4"
          alignItems="center"
          backgroundColor="white"
          flex={1}
          paddingHorizontal="$4"
          paddingTop="$4"
          paddingBottom={paddingBottom}
        >
          {/* Back Button */}
          <XStack width="100%" justifyContent="flex-start">
            <Button
              backgroundColor="transparent"
              borderRadius="$2"
              paddingHorizontal="$0"
              onPress={() => navigation.goBack()}
              icon={<ChevronLeft size={24} color={slate600} />}
            >
              <Text
                color={slate600}
                fontSize="$5"
                fontFamily={dinot}
                fontWeight="600"
              >
                Back
              </Text>
            </Button>
          </XStack>

          {/* Success Header */}
          <YStack
            width="100%"
            backgroundColor={green500}
            borderRadius="$4"
            padding="$4"
            alignItems="center"
          >
            <Text
              fontSize="$7"
              color={white}
              fontFamily={dinot}
              fontWeight="600"
            >
              ✓ Verification Complete
            </Text>
            <Text fontSize="$4" color={white} fontFamily={dinot} marginTop="$2">
              Your verification was successful
            </Text>
          </YStack>

          {/* Applicant Info */}
          <YStack
            width="100%"
            backgroundColor={slate200}
            borderRadius="$4"
            padding="$4"
            gap="$3"
          >
            <Text
              fontSize="$6"
              color={slate600}
              fontFamily={dinot}
              fontWeight="600"
            >
              Applicant Information
            </Text>

            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text fontSize="$4" color={slate500} fontFamily={dinot}>
                  Name:
                </Text>
                <Text
                  fontSize="$4"
                  color={slate800}
                  fontFamily={dinot}
                  fontWeight="600"
                >
                  {applicantInfo.info?.firstName || 'N/A'}{' '}
                  {applicantInfo.info?.lastName || 'N/A'}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$4" color={slate500} fontFamily={dinot}>
                  Date of Birth:
                </Text>
                <Text
                  fontSize="$4"
                  color={slate800}
                  fontFamily={dinot}
                  fontWeight="600"
                >
                  {applicantInfo.info?.dob || 'N/A'}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$4" color={slate500} fontFamily={dinot}>
                  Country:
                </Text>
                <Text
                  fontSize="$4"
                  color={slate800}
                  fontFamily={dinot}
                  fontWeight="600"
                >
                  {applicantInfo.info?.country || 'N/A'}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$4" color={slate500} fontFamily={dinot}>
                  Phone:
                </Text>
                <Text
                  fontSize="$4"
                  color={slate800}
                  fontFamily={dinot}
                  fontWeight="600"
                >
                  {applicantInfo.info?.phone || 'N/A'}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$4" color={slate500} fontFamily={dinot}>
                  Email:
                </Text>
                <Text
                  fontSize="$4"
                  color={slate800}
                  fontFamily={dinot}
                  fontWeight="600"
                >
                  {applicantInfo.email || 'N/A'}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$4" color={slate500} fontFamily={dinot}>
                  Review Result:
                </Text>
                <Text
                  fontSize="$4"
                  color={green500}
                  fontFamily={dinot}
                  fontWeight="600"
                >
                  {applicantInfo.review?.reviewAnswer ?? 'N/A'}
                </Text>
              </XStack>
            </YStack>

            {/* Raw JSON - only shown in development */}
            {__DEV__ && (
              <YStack
                marginTop="$2"
                backgroundColor={white}
                borderRadius="$2"
                padding="$3"
              >
                <Text
                  fontSize="$3"
                  color={slate400}
                  fontFamily={dinot}
                  fontWeight="600"
                  marginBottom="$2"
                >
                  Raw Data:
                </Text>
                <Text fontSize="$2" color={slate500} fontFamily={dinot}>
                  {JSON.stringify(applicantInfo, null, 2)}
                </Text>
              </YStack>
            )}
          </YStack>

          <Button
            backgroundColor={slate600}
            borderRadius="$2"
            height="$6"
            width="100%"
            onPress={handleReset}
          >
            <Text
              color={white}
              fontSize="$6"
              fontFamily={dinot}
              fontWeight="600"
            >
              Start New Verification
            </Text>
          </Button>
        </YStack>
      </ScrollView>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <YStack
        gap="$4"
        alignItems="center"
        backgroundColor="white"
        flex={1}
        paddingHorizontal="$4"
        paddingTop="$4"
        paddingBottom={paddingBottom}
      >
        {/* Back Button */}
        <XStack width="100%" justifyContent="flex-start">
          <Button
            backgroundColor="transparent"
            borderRadius="$2"
            paddingHorizontal="$0"
            onPress={() => navigation.goBack()}
            icon={<ChevronLeft size={24} color={slate600} />}
          >
            <Text
              color={slate600}
              fontSize="$5"
              fontFamily={dinot}
              fontWeight="600"
            >
              Back
            </Text>
          </Button>
        </XStack>

        {/* TEE Service Status */}
        <YStack
          width="100%"
          backgroundColor={slate200}
          borderRadius="$4"
          padding="$4"
        >
          <Text
            fontSize="$5"
            color={slate600}
            fontFamily={dinot}
            fontWeight="600"
          >
            TEE Service
          </Text>
          {__DEV__ && (
            <Text
              fontSize="$3"
              color={slate500}
              fontFamily={dinot}
              marginTop="$2"
            >
              {SUMSUB_TEE_URL}
            </Text>
          )}
        </YStack>

        {/* Phone Number Input */}
        <YStack width="100%" gap="$2">
          <Text
            fontSize="$4"
            color={slate600}
            fontFamily={dinot}
            fontWeight="600"
          >
            Phone Number
          </Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+11234567890"
            keyboardType="phone-pad"
            style={{
              backgroundColor: white,
              borderWidth: 1,
              borderColor: slate200,
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              fontFamily: dinot,
              color: slate800,
            }}
          />
        </YStack>

        {/* Generate Token Button */}
        <Button
          backgroundColor={slate600}
          borderRadius="$2"
          height="$6"
          width="100%"
          onPress={handleFetchToken}
          disabled={loading || !phoneNumber}
          opacity={loading || !phoneNumber ? 0.5 : 1}
        >
          <Text color={white} fontSize="$6" fontFamily={dinot} fontWeight="600">
            {loading ? 'Requesting token…' : 'Generate Access Token'}
          </Text>
        </Button>

        {/* Token Status */}
        {accessToken && (
          <YStack
            width="100%"
            backgroundColor={green500}
            borderRadius="$4"
            padding="$4"
          >
            <Text
              fontSize="$5"
              color={white}
              fontFamily={dinot}
              fontWeight="600"
            >
              ✓ Access Token Generated
            </Text>
            {__DEV__ && (
              <>
                <Text
                  fontSize="$3"
                  color={white}
                  fontFamily={dinot}
                  marginTop="$2"
                >
                  User ID: {userId}
                </Text>
                <Text
                  fontSize="$2"
                  color={white}
                  fontFamily={dinot}
                  marginTop="$2"
                  opacity={0.8}
                >
                  Token: {accessToken.substring(0, 30)}...
                </Text>
              </>
            )}
          </YStack>
        )}

        {/* Launch SDK Button */}
        {accessToken && (
          <Button
            backgroundColor={green500}
            borderRadius="$2"
            height="$6"
            width="100%"
            onPress={handleLaunchSumsub}
            disabled={sdkLaunching}
            opacity={sdkLaunching ? 0.5 : 1}
          >
            <Text
              color={white}
              fontSize="$6"
              fontFamily={dinot}
              fontWeight="600"
            >
              {sdkLaunching ? 'Launching…' : 'Launch Sumsub SDK'}
            </Text>
          </Button>
        )}

        {/* Error Display */}
        {error && (
          <YStack
            width="100%"
            backgroundColor={red500}
            borderRadius="$4"
            padding="$4"
          >
            <Text
              fontSize="$5"
              color={white}
              fontFamily={dinot}
              fontWeight="600"
            >
              Error
            </Text>
            <Text fontSize="$3" color={white} fontFamily={dinot} marginTop="$2">
              {error}
            </Text>
          </YStack>
        )}

        {/* SDK Result Display */}
        {result && (
          <YStack
            width="100%"
            backgroundColor={slate200}
            borderRadius="$4"
            padding="$4"
            gap="$2"
          >
            <Text
              fontSize="$6"
              color={slate600}
              fontFamily={dinot}
              fontWeight="600"
            >
              SDK Result
            </Text>

            <YStack gap="$1">
              <Text fontSize="$4" color={slate500} fontFamily={dinot}>
                Success:{' '}
                <Text
                  fontWeight="600"
                  color={result.success ? green500 : red500}
                >
                  {result.success ? 'Yes' : 'No'}
                </Text>
              </Text>

              <Text fontSize="$4" color={slate500} fontFamily={dinot}>
                Status:{' '}
                <Text fontWeight="600" color={slate600}>
                  {result.status}
                </Text>
              </Text>

              {result.errorType && (
                <Text fontSize="$4" color={slate500} fontFamily={dinot}>
                  Error Type:{' '}
                  <Text fontWeight="600" color={red500}>
                    {result.errorType}
                  </Text>
                </Text>
              )}

              {result.errorMsg && (
                <Text fontSize="$4" color={slate500} fontFamily={dinot}>
                  Error Message:{' '}
                  <Text fontWeight="600" color={red500}>
                    {result.errorMsg}
                  </Text>
                </Text>
              )}
            </YStack>

            <Text
              fontSize="$3"
              color={slate500}
              fontFamily={dinot}
              marginTop="$2"
            >
              Waiting for verification results from WebSocket...
            </Text>
          </YStack>
        )}

        {/* Instructions */}
        <YStack
          width="100%"
          backgroundColor={yellow500}
          borderRadius="$4"
          padding="$4"
          gap="$2"
        >
          <Text fontSize="$5" color={white} fontFamily={dinot} fontWeight="600">
            Instructions
          </Text>
          <Text fontSize="$3" color={white} fontFamily={dinot}>
            1. Make sure the TEE service is running at {SUMSUB_TEE_URL}
          </Text>
          <Text fontSize="$3" color={white} fontFamily={dinot}>
            2. Enter a phone number and tap "Generate Access Token"
          </Text>
          <Text fontSize="$3" color={white} fontFamily={dinot}>
            3. Tap "Launch Sumsub SDK" to start verification
          </Text>
          <Text fontSize="$3" color={white} fontFamily={dinot}>
            4. Complete the verification flow
          </Text>
          <Text fontSize="$3" color={white} fontFamily={dinot}>
            5. Results will appear automatically via WebSocket
          </Text>
        </YStack>
      </YStack>
    </ScrollView>
  );
};

export default SumsubTestScreen;
