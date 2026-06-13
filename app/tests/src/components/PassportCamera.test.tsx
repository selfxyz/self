// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { render } from '@testing-library/react-native';

import { PassportCamera as NativePassportCamera } from '@/components/native/PassportCamera';

// Mock the SDK client hook to provide a spyable MRZ parser
const mockExtract = jest.fn();
jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: () => ({ extractMRZInfo: mockExtract }),
}));

// Capture props passed to the native view so we can trigger callbacks
let nativeProps: any;
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: ({ ios }: any) => ios },
  PixelRatio: { getPixelSizeForLayoutSize: () => 0 },
  codegenNativeCommands: jest.fn(() => ({})),
  codegenNativeComponent: jest.fn(() => () => null),
  requireNativeComponent: (name: string) => {
    const MockNativeComponent = jest.fn((props: any) => {
      nativeProps = props;
      return null;
    });
    MockNativeComponent.displayName = `Mock(${name})`;
    return MockNativeComponent;
  },
}));

describe('PassportCamera components', () => {
  beforeEach(() => {
    mockExtract.mockReset();
    nativeProps = undefined;
  });

  it('renders the iOS native view and forwards passport reads', () => {
    const onPassportRead = jest.fn();
    render(<NativePassportCamera isMounted onPassportRead={onPassportRead} />);

    expect(nativeProps).toEqual(
      expect.objectContaining({
        onPassportRead: expect.any(Function),
        onError: expect.any(Function),
        style: expect.objectContaining({
          width: '130%',
          height: '130%',
        }),
      }),
    );
    expect(nativeProps).not.toHaveProperty('isMounted');
  });

  it('invokes MRZ parser for string data on native', () => {
    const onPassportRead = jest.fn();
    render(<NativePassportCamera isMounted onPassportRead={onPassportRead} />);
    const mrz = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10`;
    const parsed = {
      documentNumber: 'L898902C3',
      validation: { overall: true },
    } as any;
    mockExtract.mockReturnValue(parsed);

    nativeProps.onPassportRead({ nativeEvent: { data: mrz } });

    expect(mockExtract).toHaveBeenCalledWith(mrz);
    expect(onPassportRead).toHaveBeenCalledWith(null, parsed);
  });

  it('maps object-form MRZ data directly on native', () => {
    const onPassportRead = jest.fn();
    render(<NativePassportCamera isMounted onPassportRead={onPassportRead} />);

    const obj = {
      documentNumber: '123456789',
      birthDate: '900101',
      expiryDate: '240101',
      countryCode: 'UTO',
      documentType: 'P',
    };

    nativeProps.onPassportRead({ nativeEvent: { data: obj } });

    expect(mockExtract).not.toHaveBeenCalled();
    expect(onPassportRead).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        documentNumber: '123456789',
        dateOfExpiry: '240101',
        dateOfBirth: '900101',
        documentType: 'P',
        issuingCountry: 'UTO',
      }),
    );
  });

  it('maps native errors to Error objects on native', () => {
    const onPassportRead = jest.fn();
    render(<NativePassportCamera isMounted onPassportRead={onPassportRead} />);

    nativeProps.onError({
      nativeEvent: {
        error: 'NativeScanError',
        errorMessage: 'scan failed',
        stackTrace: 'stack-trace',
      },
    });

    expect(onPassportRead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'NativeScanError',
        message: 'scan failed',
        stack: 'stack-trace',
      }),
    );
  });
});
