// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { assign, createMachine } from 'xstate';
import { useMachine } from '@xstate/react';

import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { HeldPrimaryButton } from '@/components/buttons/PrimaryButtonLongHold';
import Description from '@/components/typography/Description';
import { black } from '@/utils/colors';

interface HeldPrimaryButtonProveScreenProps {
  onVerify: () => void;
  selectedAppSessionId: string | undefined | null;
  hasScrolledToBottom: boolean;
  isReadyToProve: boolean;
}

interface ButtonContext {
  selectedAppSessionId: string | undefined | null;
  hasScrolledToBottom: boolean;
  isReadyToProve: boolean;
  onVerify: () => void;
}

type ButtonEvent =
  | {
      type: 'PROPS_UPDATED';
      selectedAppSessionId: string | undefined | null;
      hasScrolledToBottom: boolean;
      isReadyToProve: boolean;
    }
  | { type: 'VERIFY' };

const buttonMachine = createMachine(
  {
    id: 'proveButton',
    types: {} as {
      context: ButtonContext;
      events: ButtonEvent;
      actions: { type: 'callOnVerify' } | { type: 'updateContext' };
    },
    initial: 'waitingForSession',
    context: ({ input }: { input: { onVerify: () => void } }) => ({
      selectedAppSessionId: null as string | undefined | null,
      hasScrolledToBottom: false,
      isReadyToProve: false,
      onVerify: input.onVerify,
    }),
    on: {
      PROPS_UPDATED: {
        actions: 'updateContext',
      },
    },
    states: {
      waitingForSession: {
        always: {
          target: 'needsScroll',
          guard: ({ context }) => !!context.selectedAppSessionId,
        },
      },
      needsScroll: {
        always: [
          {
            target: 'waitingForSession',
            guard: ({ context }) => !context.selectedAppSessionId,
          },
          {
            target: 'preparing',
            guard: ({ context }) => context.hasScrolledToBottom,
          },
        ],
      },
      preparing: {
        always: [
          {
            target: 'waitingForSession',
            guard: ({ context }) => !context.selectedAppSessionId,
          },
          {
            target: 'needsScroll',
            guard: ({ context }) => !context.hasScrolledToBottom,
          },
          {
            target: 'ready',
            guard: ({ context }) => context.isReadyToProve,
          },
        ],
        after: {
          500: { target: 'preparing2' },
        },
      },
      preparing2: {
        always: [
          {
            target: 'waitingForSession',
            guard: ({ context }) => !context.selectedAppSessionId,
          },
          {
            target: 'needsScroll',
            guard: ({ context }) => !context.hasScrolledToBottom,
          },
          {
            target: 'ready',
            guard: ({ context }) => context.isReadyToProve,
          },
        ],
        after: {
          500: { target: 'preparing3' },
        },
      },
      preparing3: {
        always: [
          {
            target: 'waitingForSession',
            guard: ({ context }) => !context.selectedAppSessionId,
          },
          {
            target: 'needsScroll',
            guard: ({ context }) => !context.hasScrolledToBottom,
          },
          {
            target: 'ready',
            guard: ({ context }) => context.isReadyToProve,
          },
        ],
      },
      ready: {
        on: {
          VERIFY: 'verifying',
        },
        always: [
          {
            target: 'waitingForSession',
            guard: ({ context }) => !context.selectedAppSessionId,
          },
          {
            target: 'needsScroll',
            guard: ({ context }) => !context.hasScrolledToBottom,
          },
          {
            target: 'preparing',
            guard: ({ context }) => !context.isReadyToProve,
          },
        ],
      },
      verifying: {
        entry: 'callOnVerify',
        // Remove always transitions checking hasScrolledToBottom and isReadyToProve
        // Keep the button visually verifying until the component unmounts or session changes
        always: {
          target: 'waitingForSession',
          guard: ({ context }) => !context.selectedAppSessionId,
        },
      },
    },
  },
  {
    actions: {
      updateContext: assign(({ context, event }) => {
        if (event.type === 'PROPS_UPDATED') {
          if (
            context.selectedAppSessionId !== event.selectedAppSessionId ||
            context.hasScrolledToBottom !== event.hasScrolledToBottom ||
            context.isReadyToProve !== event.isReadyToProve
          ) {
            return {
              selectedAppSessionId: event.selectedAppSessionId,
              hasScrolledToBottom: event.hasScrolledToBottom,
              isReadyToProve: event.isReadyToProve,
            };
          }
        }
        return context;
      }),
      callOnVerify: ({ context }) => {
        context.onVerify();
      },
    },
  },
);

export const HeldPrimaryButtonProveScreen: React.FC<
  HeldPrimaryButtonProveScreenProps
> = ({
  onVerify,
  selectedAppSessionId,
  hasScrolledToBottom,
  isReadyToProve,
}) => {
  const [state, send] = useMachine(buttonMachine, {
    input: { onVerify },
  });

  useEffect(() => {
    send({
      type: 'PROPS_UPDATED',
      selectedAppSessionId,
      hasScrolledToBottom,
      isReadyToProve,
    });
  }, [selectedAppSessionId, hasScrolledToBottom, isReadyToProve, send]);

  const isDisabled = !state.matches('ready');

  const renderButtonContent = () => {
    if (state.matches('waitingForSession')) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator color={black} style={{ marginRight: 8 }} />
          <Description color={black}>Waiting for app...</Description>
        </View>
      );
    }
    if (state.matches('needsScroll')) {
      return 'Please read all disclosures';
    }
    if (state.matches('preparing')) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator color={black} style={{ marginRight: 8 }} />
          <Description color={black}>Accessing to Keychain data</Description>
        </View>
      );
    }
    if (state.matches('preparing2')) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator color={black} style={{ marginRight: 8 }} />
          <Description color={black}>Parsing passport data</Description>
        </View>
      );
    }
    if (state.matches('preparing3')) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator color={black} style={{ marginRight: 8 }} />
          <Description color={black}>Preparing for verification</Description>
        </View>
      );
    }
    if (state.matches('ready')) {
      return 'Hold to verify';
    }
    if (state.matches('verifying')) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator color={black} style={{ marginRight: 8 }} />
          <Description color={black}>Generating proof</Description>
        </View>
      );
    }
    return null;
  };

  return (
    <HeldPrimaryButton
      trackEvent={ProofEvents.PROOF_VERIFY_LONG_PRESS}
      onLongPress={() => {
        if (state.matches('ready')) {
          send({ type: 'VERIFY' });
        }
      }}
      disabled={isDisabled}
    >
      {renderButtonContent()}
    </HeldPrimaryButton>
  );
};
