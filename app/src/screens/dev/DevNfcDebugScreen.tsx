// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Input, Text, XStack, YStack } from 'tamagui';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  green600,
  red500,
  slate200,
  slate400,
  slate500,
  slate600,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import BugIcon from '@/assets/icons/bug_icon.svg';
import ErrorBoundary from '@/components/ErrorBoundary';
import {
  isNfcDebugBridgeSupported,
  relayUrlWithSession,
  startBridge,
  stopBridge,
} from '@/integrations/nfc/nfcDebugBridge';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';
import { useSettingStore } from '@/stores/settingStore';

// The agent runs server-side; the phone is only the device leg. To exercise the
// autonomous flow: mint a session, arm the device on it, then have the backend
// (holding DEBUG_API_TOKEN) trigger the run.
const SETUP_HINTS = [
  'export DEBUG_API_TOKEN=<secret> ANTHROPIC_API_KEY=sk-ant-…',
  'MCP_TRANSPORT=http MCP_HTTP_PORT=8080 SESSION_ENFORCE=1 npm --prefix mcp-server start',
  'adb reverse tcp:8080 tcp:8080',
  'S=$(curl -s -XPOST localhost:8080/session | jq -r .session)   # mint a session',
  'paste S below + Arm, then rest passport on phone',
  'curl -XPOST localhost:8080/debug/run -H "Authorization: Bearer $DEBUG_API_TOKEN" \\',
  '  -H "Content-Type: application/json" -d "{\\"session\\":\\"$S\\",\\"target\\":\\"device\\"}"',
];

const DevNfcDebugScreen: React.FC = () => {
  const paddingBottom = useSafeBottomPadding(20);
  const selfClient = useSelfClient();
  const { useMRZStore } = selfClient;
  const { passportNumber, dateOfBirth, dateOfExpiry } = useMRZStore();

  const relayUrl = useSettingStore(state => state.nfcDebugRelayUrl);
  const setRelayUrl = useSettingStore(state => state.setNfcDebugRelayUrl);

  const [sessionKey, setSessionKey] = useState('');
  const [documentNumber, setDocumentNumber] = useState(passportNumber ?? '');
  const [dob, setDob] = useState(dateOfBirth ?? '');
  const [doe, setDoe] = useState(dateOfExpiry ?? '');
  const [canNumber, setCanNumber] = useState('');

  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveUrl = relayUrlWithSession(relayUrl, sessionKey);

  const onArm = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await startBridge({
        relayUrl,
        sessionKey,
        documentNumber,
        dateOfBirth: dob,
        dateOfExpiry: doe,
        canNumber,
      });
      setArmed(true);
    } catch (e) {
      setArmed(false);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [relayUrl, sessionKey, documentNumber, dob, doe, canNumber]);

  const onStop = useCallback(async () => {
    setBusy(true);
    try {
      await stopBridge();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setArmed(false);
      setBusy(false);
    }
  }, []);

  if (!isNfcDebugBridgeSupported) {
    return (
      <ErrorBoundary>
        <YStack flex={1} backgroundColor="white" padding="$4" gap="$3">
          <Text fontSize="$5" color={slate600} fontFamily={dinot}>
            NFC debug bridge is unavailable
          </Text>
          <Text fontSize="$3" color={slate400} fontFamily={dinot}>
            The bridge is Android-only and requires a native build that includes
            it. Rebuild the Android app after running setup-private-modules.
          </Text>
        </YStack>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack
          gap="$3"
          backgroundColor="white"
          flex={1}
          paddingHorizontal="$4"
          paddingTop="$4"
          paddingBottom={paddingBottom}
        >
          <ParameterSection
            icon={<BugIcon />}
            title="Connection"
            description="Dial the server's /device relay for a session (use adb reverse for local)."
          >
            <YStack gap="$2">
              <Field
                label="Relay URL"
                value={relayUrl}
                onChangeText={setRelayUrl}
                placeholder="ws://localhost:8080/device"
                autoCapitalize="none"
              />
              <Field
                label="Session key (from POST /session)"
                value={sessionKey}
                onChangeText={setSessionKey}
                placeholder="blank = default session (dev only)"
                autoCapitalize="none"
              />
            </YStack>
          </ParameterSection>

          <ParameterSection
            icon={<BugIcon />}
            title="Document (MRZ)"
            description="Used on-device for auth — never leaves the phone. Prefilled from the last scan when available."
          >
            <YStack gap="$2">
              <Field
                label="Document number"
                value={documentNumber}
                onChangeText={setDocumentNumber}
                autoCapitalize="characters"
              />
              <Field
                label="Date of birth (YYMMDD)"
                value={dob}
                onChangeText={setDob}
                keyboardType="number-pad"
              />
              <Field
                label="Date of expiry (YYMMDD)"
                value={doe}
                onChangeText={setDoe}
                keyboardType="number-pad"
              />
              <Field
                label="CAN (optional)"
                value={canNumber}
                onChangeText={setCanNumber}
                keyboardType="number-pad"
              />
            </YStack>
          </ParameterSection>

          <ParameterSection
            icon={<BugIcon />}
            title="Controls"
            description="Arm, then rest the passport on the phone while an agent drives the read."
          >
            <YStack gap="$2">
              <Text
                fontSize="$3"
                color={armed ? green600 : slate500}
                fontFamily={dinot}
              >
                {armed
                  ? `Armed · ${effectiveUrl}`
                  : 'Stopped — not listening for a tag.'}
              </Text>
              {error ? (
                <Text fontSize="$3" color={red500} fontFamily={dinot}>
                  {error}
                </Text>
              ) : null}
              <XStack gap="$2">
                <Button
                  flex={1}
                  backgroundColor={green600}
                  color="white"
                  borderRadius="$2"
                  height="$5"
                  disabled={busy || armed}
                  opacity={busy || armed ? 0.5 : 1}
                  onPress={onArm}
                >
                  Arm
                </Button>
                <Button
                  flex={1}
                  backgroundColor={slate200}
                  color={slate600}
                  borderRadius="$2"
                  height="$5"
                  disabled={busy || !armed}
                  opacity={busy || !armed ? 0.5 : 1}
                  onPress={onStop}
                >
                  Stop
                </Button>
              </XStack>
            </YStack>
          </ParameterSection>

          <ParameterSection
            icon={<BugIcon />}
            title="Setup"
            description="Run these on the laptop, then point an agent at the MCP server."
            collapsible
            defaultCollapsed
          >
            <YStack gap="$2">
              {SETUP_HINTS.map(cmd => (
                <Text
                  key={cmd}
                  selectable
                  fontSize="$2"
                  color={slate600}
                  fontFamily="monospace"
                >
                  {cmd}
                </Text>
              ))}
            </YStack>
          </ParameterSection>
        </YStack>
      </ScrollView>
    </ErrorBoundary>
  );
};

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'characters';
  keyboardType?: 'default' | 'number-pad';
}

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
  keyboardType = 'default',
}) => (
  <YStack gap="$1">
    <Text fontSize="$2" color={slate400} fontFamily={dinot}>
      {label}
    </Text>
    <Input
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      keyboardType={keyboardType}
      borderColor={slate200}
      borderRadius="$2"
      fontFamily={dinot}
    />
  </YStack>
);

export default DevNfcDebugScreen;
