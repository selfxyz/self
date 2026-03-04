// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { Button, ScrollView, Text, XStack, YStack } from 'tamagui';
import { GOOGLE_SIGNIN_IOS_CLIENT_ID, GOOGLE_SIGNIN_WEB_CLIENT_ID } from '@env';
import appleAuth, {
  AppleButton,
  AppleRequestOperation,
  AppleRequestScope,
} from '@invertase/react-native-apple-authentication';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import {
  red500,
  slate100,
  slate200,
  slate500,
  slate600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import GoogleIcon from '@/assets/icons/google.svg';

type SocialUser = {
  provider: 'google' | 'apple';
  id?: string;
  name?: string;
  email?: string;
};

const formatFullName = (fullName?: {
  givenName?: string | null;
  familyName?: string | null;
  middleName?: string | null;
}) => {
  if (!fullName) {
    return undefined;
  }

  const nameParts = [
    fullName.givenName,
    fullName.middleName,
    fullName.familyName,
  ].filter(Boolean);

  return nameParts.length > 0 ? nameParts.join(' ') : undefined;
};

const SocialLoginDemoScreen: React.FC = () => {
  const authInFlightRef = useRef(false);
  const [user, setUser] = useState<SocialUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const appleAvailable = Platform.OS === 'ios' && appleAuth.isSupported;

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_SIGNIN_WEB_CLIENT_ID,
      iosClientId: GOOGLE_SIGNIN_IOS_CLIENT_ID,
    });

    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser?.user && isMounted) {
          setUser({
            provider: 'google',
            id: currentUser.user.id,
            name: currentUser.user.name ?? undefined,
            email: currentUser.user.email ?? undefined,
          });
        }
      } catch (error) {
        const code = (error as { code?: string }).code;
        console.warn('Silent Google sign-in failed', code ?? 'unknown');
      }
    };

    loadCurrentUser().catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!appleAvailable) {
      return undefined;
    }

    return appleAuth.onCredentialRevoked(async () => {
      setUser(null);
    });
  }, [appleAvailable]);

  const handleError = (title: string, message: string) => {
    setErrorMessage(message);
    Alert.alert(title, message);
  };

  const handleGoogleSignIn = async () => {
    if (loading || authInFlightRef.current) {
      return;
    }
    authInFlightRef.current = true;
    setLoading(true);
    setErrorMessage(null);

    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }
      const response = await GoogleSignin.signIn();

      if (response.type !== 'success') {
        return;
      }

      await GoogleSignin.getTokens();
      // Tokens retrieved successfully - available for backend integration

      setUser({
        provider: 'google',
        id: response.data.user.id,
        name: response.data.user.name ?? undefined,
        email: response.data.user.email ?? undefined,
      });
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;

      if (code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      if (code === statusCodes.IN_PROGRESS) {
        handleError('Google Sign-In', 'Sign-in already in progress.');
        return;
      }

      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        handleError('Google Sign-In', 'Google Play Services not available.');
        return;
      }

      handleError(
        'Google Sign-In',
        'Unable to sign in with Google. Please try again.',
      );
    } finally {
      authInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (loading || authInFlightRef.current) {
      return;
    }
    if (!appleAvailable) {
      handleError('Apple Sign-In', 'Apple Sign-In is not supported here.');
      return;
    }

    authInFlightRef.current = true;
    setLoading(true);
    setErrorMessage(null);

    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: AppleRequestOperation.LOGIN,
        requestedScopes: [AppleRequestScope.EMAIL, AppleRequestScope.FULL_NAME],
      });

      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user,
      );

      if (credentialState !== appleAuth.State.AUTHORIZED) {
        handleError(
          'Apple Sign-In',
          'Apple credential state is no longer valid.',
        );
        return;
      }

      // Apple identity token retrieved successfully - available for backend integration

      setUser({
        provider: 'apple',
        id: appleAuthRequestResponse.user,
        name: formatFullName(appleAuthRequestResponse.fullName ?? undefined),
        email: appleAuthRequestResponse.email ?? undefined,
      });
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === appleAuth.Error.CANCELED) {
        return;
      }

      handleError(
        'Apple Sign-In',
        'Unable to sign in with Apple. Please try again.',
      );
    } finally {
      authInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      if (user?.provider === 'google') {
        await GoogleSignin.signOut();
      }
      setUser(null);
    } catch {
      handleError('Sign Out', 'Unable to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      backgroundColor={slate100}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <YStack gap="$4">
        <YStack gap="$2">
          <Text fontSize="$7" fontFamily={dinot} color={slate600}>
            Social Login Demo
          </Text>
          <Text fontSize="$4" color={slate500}>
            Use these buttons to test Google and Apple sign-in flows. Tokens can
            be retrieved for backend integration.
          </Text>
        </YStack>

        <YStack gap="$3">
          <Button
            style={{ backgroundColor: white, height: 44 }}
            borderColor={slate200}
            borderWidth={1}
            borderRadius="$2"
            padding={0}
            onPress={handleGoogleSignIn}
            disabled={loading}
            pressStyle={{ opacity: 0.8 }}
          >
            <XStack
              width="100%"
              justifyContent="center"
              alignItems="center"
              paddingHorizontal="$4"
              height="100%"
              gap="$3"
            >
              {!loading && <GoogleIcon width={18} height={18} />}
              <Text
                fontSize="$5"
                color={slate600}
                fontFamily={dinot}
                fontWeight="600"
              >
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </Text>
            </XStack>
          </Button>

          {appleAvailable ? (
            <YStack>
              <AppleButton
                buttonStyle={AppleButton.Style.BLACK}
                buttonType={AppleButton.Type.SIGN_IN}
                style={{ width: '100%', height: 44 }}
                onPress={handleAppleSignIn}
              />
            </YStack>
          ) : (
            <Text fontSize="$4" color={slate500}>
              Apple Sign-In is only available on iOS devices.
            </Text>
          )}

          {user && (
            <Button
              style={{ backgroundColor: red500, height: 44 }}
              borderColor={red500}
              borderRadius="$2"
              padding={0}
              onPress={handleSignOut}
              disabled={loading}
              pressStyle={{ opacity: 0.8 }}
            >
              <XStack
                width="100%"
                justifyContent="center"
                alignItems="center"
                height="100%"
              >
                <Text
                  fontSize="$5"
                  color={white}
                  fontFamily={dinot}
                  fontWeight="600"
                >
                  {loading && user ? 'Logging out...' : 'Log Out'}
                </Text>
              </XStack>
            </Button>
          )}
        </YStack>

        <YStack gap="$3">
          <Text fontSize="$5" fontFamily={dinot} color={slate600}>
            Status
          </Text>
          {loading && (
            <Text fontSize="$4" color={slate500}>
              Signing in...
            </Text>
          )}
          {errorMessage && (
            <Text fontSize="$4" color={red500}>
              {errorMessage}
            </Text>
          )}
          {user ? (
            <YStack
              backgroundColor={white}
              borderColor={slate200}
              borderRadius="$3"
              borderWidth={1}
              padding="$4"
              gap="$2"
            >
              <Text fontSize="$4" color={slate600} fontFamily={dinot}>
                Provider: {user.provider}
              </Text>
              <Text fontSize="$4" color={slate600}>
                Name: {user.name ?? 'Not provided'}
              </Text>
              <Text fontSize="$4" color={slate600}>
                Email: {user.email ?? 'Not provided'}
              </Text>
              <Text fontSize="$4" color={slate600}>
                ID: {user.id ?? 'Not provided'}
              </Text>
            </YStack>
          ) : (
            <Text fontSize="$4" color={slate500}>
              No user signed in yet.
            </Text>
          )}
        </YStack>
      </YStack>
    </ScrollView>
  );
};

export default SocialLoginDemoScreen;
