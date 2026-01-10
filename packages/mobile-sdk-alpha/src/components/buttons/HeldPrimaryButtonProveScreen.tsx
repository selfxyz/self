// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { assign, createMachine } from 'xstate';

import { ProofEvents } from '../../constants/analytics';
import { black } from '../../constants/colors';
import Description from '../typography/Description';
import { HeldPrimaryButton } from './PrimaryButtonLongHold';

import { useMachine } from '@xstate/react';

interface HeldPrimaryButtonProveScreenProps {
  onVerify: () => void;
  selectedAppSessionId: string | undefined | null;
  hasScrolledToBottom: boolean;
  isScrollable: boolean;
  isReadyToProve: boolean;
  isDocumentExpired: boolean;
}

interface ButtonContext {
  selectedAppSessionId: string | undefined | null;
  hasScrolledToBottom: boolean;
  isReadyToProve: boolean;
  onVerify: () => void;
  isDocumentExpired: boolean;
}

type ButtonEvent =
  | {
      type: 'PROPS_UPDATED';
      selectedAppSessionId: string | undefined | null;
      hasScrolledToBottom: boolean;
      isReadyToProve: boolean;
      isDocumentExpired: boolean;
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
      isDocumentExpired: false,
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
            guard: ({ context }) => context.hasScrolledToBottom && !context.isReadyToProve,
          },
          {
            target: 'ready',
            guard: ({ context }) => context.hasScrolledToBottom && context.isReadyToProve && !context.isDocumentExpired,
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
            guard: ({ context }) => context.isReadyToProve && !context.isDocumentExpired,
          },
        ],
        after: {
          100: { target: 'preparing2' },
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
            guard: ({ context }) => context.isReadyToProve && !context.isDocumentExpired,
          },
        ],
        after: {
          100: { target: 'preparing3' },
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
            guard: ({ context }) => context.isReadyToProve && !context.isDocumentExpired,
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
            context.isReadyToProve !== event.isReadyToProve ||
            context.isDocumentExpired !== event.isDocumentExpired
          ) {
            return {
              selectedAppSessionId: event.selectedAppSessionId,
              hasScrolledToBottom: event.hasScrolledToBottom,
              isReadyToProve: event.isReadyToProve,
              isDocumentExpired: event.isDocumentExpired,
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

export const HeldPrimaryButtonProveScreen: React.FC<HeldPrimaryButtonProveScreenProps> = ({
  onVerify,
  selectedAppSessionId,
  hasScrolledToBottom,
  isScrollable,
  isReadyToProve,
  isDocumentExpired,
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
      isDocumentExpired,
    });
  }, [selectedAppSessionId, hasScrolledToBottom, isReadyToProve, isDocumentExpired, send]);

  const isDisabled = !state.matches('ready') && !state.matches('verifying');

  const LoadingContent: React.FC<{ text: string }> = ({ text }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <ActivityIndicator color={black} style={{ marginRight: 8 }} />
      <Description color={black}>{text}</Description>
    </View>
  );

  const renderButtonContent = () => {
    if (isDocumentExpired) {
      return 'Document expired';
    }
    if (state.matches('waitingForSession')) {
      return <LoadingContent text="Waiting for app..." />;
    }
    if (state.matches('needsScroll')) {
      if (isScrollable) {
        return 'Scroll to read full request';
      }
      return <LoadingContent text="Waiting for app..." />;
    }
    if (state.matches('preparing')) {
      return <LoadingContent text="Accessing to Keychain data" />;
    }
    if (state.matches('preparing2')) {
      return <LoadingContent text="Parsing passport data" />;
    }
    if (state.matches('preparing3')) {
      return <LoadingContent text="Preparing for verification" />;
    }
    if (state.matches('ready')) {
      return 'Press and hold to verify';
    }
    if (state.matches('verifying')) {
      return <LoadingContent text="Generating proof" />;
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
