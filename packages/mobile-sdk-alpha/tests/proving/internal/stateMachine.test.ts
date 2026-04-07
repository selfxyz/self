// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { createActor } from 'xstate';

import { provingMachine } from '../../../src/proving/internal/stateMachine';

const moveToPostProving = (actor: ReturnType<typeof createActor>) => {
  actor.send({ type: 'FETCH_DATA' } as any);
  actor.send({ type: 'FETCH_SUCCESS' } as any);
  actor.send({ type: 'VALIDATION_SUCCESS' } as any);
  actor.send({ type: 'CONNECT_SUCCESS' } as any);
  actor.send({ type: 'START_PROVING' } as any);
  actor.send({ type: 'PROVE_SUCCESS' } as any);
};

describe('internal stateMachine', () => {
  it('starts in idle', () => {
    const actor = createActor(provingMachine);
    actor.start();

    expect(actor.getSnapshot().value).toBe('idle');
    actor.stop();
  });

  it('supports full happy path to completed', () => {
    const actor = createActor(provingMachine);
    actor.start();

    actor.send({ type: 'PARSE_ID_DOCUMENT' } as any);
    actor.send({ type: 'PARSE_SUCCESS' } as any);
    actor.send({ type: 'FETCH_SUCCESS' } as any);
    actor.send({ type: 'VALIDATION_SUCCESS' } as any);
    actor.send({ type: 'CONNECT_SUCCESS' } as any);
    actor.send({ type: 'START_PROVING' } as any);
    actor.send({ type: 'PROVE_SUCCESS' } as any);
    actor.send({ type: 'COMPLETED' } as any);

    expect(actor.getSnapshot().value).toBe('completed');
    actor.stop();
  });

  it('keeps SWITCH_TO_REGISTER transition from post_proving to fetching_data', () => {
    const actor = createActor(provingMachine);
    actor.start();

    moveToPostProving(actor);
    expect(actor.getSnapshot().value).toBe('post_proving');

    actor.send({ type: 'SWITCH_TO_REGISTER' } as any);

    expect(actor.getSnapshot().value).toBe('fetching_data');
    actor.stop();
  });

  it.each([
    { setup: [] as string[], event: 'ERROR', expected: 'error' },
    { setup: ['PARSE_ID_DOCUMENT'], event: 'PARSE_ERROR', expected: 'error' },
    { setup: ['FETCH_DATA'], event: 'FETCH_ERROR', expected: 'error' },
    { setup: ['FETCH_DATA', 'FETCH_SUCCESS'], event: 'VALIDATION_ERROR', expected: 'error' },
    { setup: ['FETCH_DATA', 'FETCH_SUCCESS', 'VALIDATION_SUCCESS'], event: 'CONNECT_ERROR', expected: 'error' },
    {
      setup: ['FETCH_DATA', 'FETCH_SUCCESS', 'VALIDATION_SUCCESS', 'CONNECT_SUCCESS'],
      event: 'PROVE_ERROR',
      expected: 'error',
    },
    {
      setup: ['FETCH_DATA', 'FETCH_SUCCESS', 'VALIDATION_SUCCESS', 'CONNECT_SUCCESS', 'START_PROVING'],
      event: 'PROVE_FAILURE',
      expected: 'failure',
    },
  ])('transitions to $expected on $event', ({ setup, event, expected }) => {
    const actor = createActor(provingMachine);
    actor.start();

    setup.forEach(type => actor.send({ type } as any));
    actor.send({ type: event } as any);

    expect(actor.getSnapshot().value).toBe(expected);
    actor.stop();
  });
});
