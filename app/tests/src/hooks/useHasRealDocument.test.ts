// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook, waitFor } from '@testing-library/react-native';

import useHasRealDocument from '@/hooks/useHasRealDocument';
import { usePassport } from '@/providers/passportDataProvider';

const mockUseFocusEffect = jest.fn();
let focusEffectCallback: (() => void | (() => void)) | undefined;

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    mockUseFocusEffect(callback),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  usePassport: jest.fn(),
}));

const mockUsePassport = usePassport as jest.MockedFunction<typeof usePassport>;

describe('useHasRealDocument', () => {
  const loadDocumentCatalog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFocusEffect.mockImplementation(
      (callback: () => void | (() => void)) => {
        focusEffectCallback = callback;
      },
    );
    mockUsePassport.mockReturnValue({
      loadDocumentCatalog,
    } as ReturnType<typeof usePassport>);
  });

  it('starts as null and resolves true when a real document exists', async () => {
    loadDocumentCatalog.mockResolvedValue({
      documents: [{ id: 'real-doc', mock: false }],
    });

    const { result } = renderHook(() => useHasRealDocument('SettingsScreen'));

    expect(result.current.hasRealDocument).toBeNull();

    act(() => {
      focusEffectCallback?.();
    });

    await waitFor(() => {
      expect(result.current.hasRealDocument).toBe(true);
    });

    expect(loadDocumentCatalog).toHaveBeenCalledTimes(1);
  });

  it('resolves false and logs when the catalog structure is invalid', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    loadDocumentCatalog.mockResolvedValue({
      documents: null,
    });

    const { result } = renderHook(() =>
      useHasRealDocument('ManageDocumentsScreen'),
    );

    act(() => {
      focusEffectCallback?.();
    });

    await waitFor(() => {
      expect(result.current.hasRealDocument).toBe(false);
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'ManageDocumentsScreen: invalid catalog structure',
    );

    warnSpy.mockRestore();
  });

  it('refresh updates state when the catalog changes after mount', async () => {
    loadDocumentCatalog
      .mockResolvedValueOnce({
        documents: [{ id: 'mock-doc', mock: true }],
      })
      .mockResolvedValueOnce({
        documents: [{ id: 'real-doc', mock: false }],
      });

    const { result } = renderHook(() => useHasRealDocument());

    act(() => {
      focusEffectCallback?.();
    });

    await waitFor(() => {
      expect(result.current.hasRealDocument).toBe(false);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.hasRealDocument).toBe(true);
    });

    expect(loadDocumentCatalog).toHaveBeenCalledTimes(2);
  });
});
