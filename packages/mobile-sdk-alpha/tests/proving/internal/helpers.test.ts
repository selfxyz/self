// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkActorInitialized, createProofContext, getPlatform } from '../../../src/proving/internal/helpers';
import type { SelfClient } from '../../../src/types/public';

describe('helpers', () => {
  describe('getPlatform', () => {
    it('returns "ios" when Platform.OS is "ios"', () => {
      vi.spyOn(Platform, 'OS', 'get').mockReturnValue('ios');

      const result = getPlatform();

      expect(result).toBe('ios');
    });

    it('returns "android" when Platform.OS is "android"', () => {
      vi.spyOn(Platform, 'OS', 'get').mockReturnValue('android');

      const result = getPlatform();

      expect(result).toBe('android');
    });

    it('returns "android" for any non-ios platform', () => {
      vi.spyOn(Platform, 'OS', 'get').mockReturnValue('web' as any);

      const result = getPlatform();

      expect(result).toBe('android');
    });
  });

  describe('createProofContext', () => {
    let mockSelfClient: SelfClient;

    beforeEach(() => {
      mockSelfClient = {
        getSelfAppState: vi.fn().mockReturnValue({
          selfApp: {
            userId: 'test-user-123',
          },
        }),
        getProvingState: vi.fn().mockReturnValue({
          uuid: 'test-session-uuid',
          circuitType: 'register',
          currentState: 'proving',
        }),
      } as unknown as SelfClient;

      vi.spyOn(Platform, 'OS', 'get').mockReturnValue('ios');
    });

    it('creates context with all required fields', () => {
      const result = createProofContext(mockSelfClient, 'testStage');

      expect(result).toEqual({
        sessionId: 'test-session-uuid',
        userId: 'test-user-123',
        circuitType: 'register',
        currentState: 'proving',
        stage: 'testStage',
        platform: 'ios',
      });
    });

    it('uses uuid as sessionId when available', () => {
      const result = createProofContext(mockSelfClient, 'testStage');

      expect(result.sessionId).toBe('test-session-uuid');
    });

    it('falls back to "unknown-session" when uuid is null', () => {
      mockSelfClient.getProvingState = vi.fn().mockReturnValue({
        uuid: null,
        circuitType: 'register',
        currentState: 'proving',
      });

      const result = createProofContext(mockSelfClient, 'testStage');

      expect(result.sessionId).toBe('unknown-session');
    });

    it('handles missing userId gracefully', () => {
      mockSelfClient.getSelfAppState = vi.fn().mockReturnValue({
        selfApp: null,
      });

      const result = createProofContext(mockSelfClient, 'testStage');

      expect(result.userId).toBeUndefined();
    });

    it('handles null circuitType', () => {
      mockSelfClient.getProvingState = vi.fn().mockReturnValue({
        uuid: 'test-uuid',
        circuitType: null,
        currentState: 'idle',
      });

      const result = createProofContext(mockSelfClient, 'testStage');

      expect(result.circuitType).toBeNull();
    });

    it('falls back to "unknown-state" when currentState is missing', () => {
      mockSelfClient.getProvingState = vi.fn().mockReturnValue({
        uuid: 'test-uuid',
        circuitType: 'register',
        currentState: null,
      });

      const result = createProofContext(mockSelfClient, 'testStage');

      expect(result.currentState).toBe('unknown-state');
    });

    it('applies overrides correctly', () => {
      const overrides = {
        sessionId: 'override-session',
        userId: 'override-user',
        customField: 'custom-value',
      };

      const result = createProofContext(mockSelfClient, 'testStage', overrides as any);

      expect(result.sessionId).toBe('override-session');
      expect(result.userId).toBe('override-user');
      expect((result as any).customField).toBe('custom-value');
    });

    it('includes platform from getPlatform', () => {
      vi.spyOn(Platform, 'OS', 'get').mockReturnValue('android');

      const result = createProofContext(mockSelfClient, 'testStage');

      expect(result.platform).toBe('android');
    });
  });

  describe('checkActorInitialized', () => {
    it('throws error when actor is null', () => {
      expect(() => checkActorInitialized(null)).toThrow('State machine not initialized. Call init() first.');
    });

    it('does not throw when actor is defined', () => {
      const mockActor = {
        send: vi.fn(),
        start: vi.fn(),
      } as any;

      expect(() => checkActorInitialized(mockActor)).not.toThrow();
    });

    it('narrows type correctly (type assertion test)', () => {
      const mockActor = {
        send: vi.fn(),
        start: vi.fn(),
      } as any;

      // Before calling checkActorInitialized, actor could be null
      const actor: any | null = mockActor;

      // After calling checkActorInitialized, TypeScript knows actor is not null
      checkActorInitialized(actor);

      // This should not throw TypeScript error (type narrowing works)
      actor.send({ type: 'TEST' });

      expect(mockActor.send).toHaveBeenCalledWith({ type: 'TEST' });
    });
  });
});
