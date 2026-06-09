// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect } from 'vitest';

import { resolveBundlePath } from '../bundlePath';

describe('resolveBundlePath', () => {
  it('prefers react-native-fs MainBundlePath when present', () => {
    expect(
      resolveBundlePath(
        '/var/containers/Bundle/Application/ABC/MyApp.app',
        'file:///should/not/be/used/',
      ),
    ).toBe('/var/containers/Bundle/Application/ABC/MyApp.app');
  });

  it('falls back to expo bundle uri when MainBundlePath is undefined (JS resolved, native unlinked)', () => {
    expect(
      resolveBundlePath(
        undefined,
        'file:///var/containers/Bundle/Application/ABC/MyApp.app/',
      ),
    ).toBe('/var/containers/Bundle/Application/ABC/MyApp.app');
  });

  it('falls back to expo bundle uri when MainBundlePath is an empty string', () => {
    expect(
      resolveBundlePath('', 'file:///var/containers/Bundle/Application/ABC/X.app/'),
    ).toBe('/var/containers/Bundle/Application/ABC/X.app');
  });

  it('strips scheme and trailing slashes but preserves percent-encoding so the file:// URL stays valid', () => {
    expect(
      resolveBundlePath(undefined, 'file:///var/My%20App/Self.app///'),
    ).toBe('/var/My%20App/Self.app');
  });

  it('returns undefined when neither provider supplies a path', () => {
    expect(resolveBundlePath(undefined, undefined)).toBeUndefined();
    expect(resolveBundlePath(null, '')).toBeUndefined();
  });
});
