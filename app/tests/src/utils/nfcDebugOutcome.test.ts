// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DebugReport } from '@/services/nfcDebug';
import { describeOutcome, friendlyRunError } from '@/utils/nfcDebugOutcome';

const report = (over: Partial<DebugReport>): DebugReport => ({
  status: 'success',
  ...over,
});

describe('describeOutcome', () => {
  it('reads a clean completion by status', () => {
    expect(
      describeOutcome(
        report({ status: 'success', terminationReason: 'completed' }),
      ),
    ).toEqual({
      message: expect.stringMatching(/succeeded/i),
      tone: 'success',
    });
    expect(
      describeOutcome(
        report({ status: 'partial', terminationReason: 'completed' }),
      ),
    ).toMatchObject({ tone: 'warn' });
    expect(
      describeOutcome(
        report({ status: 'failed', terminationReason: 'completed' }),
      ),
    ).toMatchObject({ tone: 'error' });
  });

  it('falls back to status when terminationReason is absent', () => {
    expect(describeOutcome(report({ status: 'success' }))).toMatchObject({
      tone: 'success',
    });
    expect(describeOutcome(report({ status: 'failed' }))).toMatchObject({
      tone: 'error',
    });
  });

  it('keeps a successful read as success even if the run wound down on a cap', () => {
    for (const terminationReason of ['deadline', 'turn_cap'] as const) {
      expect(
        describeOutcome(report({ status: 'success', terminationReason })),
      ).toMatchObject({ tone: 'success' });
    }
  });

  it('lets a dropped connection override a success status', () => {
    expect(
      describeOutcome(
        report({ status: 'success', terminationReason: 'device_dropped' }),
      ),
    ).toMatchObject({ tone: 'warn' });
  });

  it('flags a server-closed connection distinctly, regardless of status', () => {
    // device_dropped must NOT read as a clean success even if status says so.
    const out = describeOutcome(
      report({ status: 'success', terminationReason: 'device_dropped' }),
    );
    expect(out.tone).toBe('warn');
    expect(out.message).toMatch(/connection|dropped/i);
  });

  it('treats resource limits as warnings', () => {
    for (const terminationReason of ['deadline', 'turn_cap'] as const) {
      expect(
        describeOutcome(report({ status: 'failed', terminationReason })),
      ).toMatchObject({ tone: 'warn' });
    }
  });

  it('treats secure-channel and hard failures as errors', () => {
    for (const terminationReason of [
      'unrecoverable_sm',
      'refusal',
      'error',
    ] as const) {
      expect(
        describeOutcome(report({ status: 'partial', terminationReason })),
      ).toMatchObject({ tone: 'error' });
    }
  });
});

describe('friendlyRunError', () => {
  it('detects a dropped connection', () => {
    expect(friendlyRunError('device_dropped')).toMatch(/dropped/i);
    expect(friendlyRunError('connection reset')).toMatch(/dropped/i);
  });

  it('gives a generic line otherwise', () => {
    expect(friendlyRunError('turn_cap')).toMatch(/didn’t complete/i);
    expect(friendlyRunError(undefined)).toMatch(/didn’t complete/i);
  });
});
