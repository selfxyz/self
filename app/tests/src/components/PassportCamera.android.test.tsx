// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

type AndroidTestContext = {
  mockExtract: jest.Mock;
  onPassportRead: jest.Mock;
  nativeProps: { current?: any };
};

function renderAndroidPassportCamera(isMounted = true): AndroidTestContext {
  const mockExtract = jest.fn();
  const onPassportRead = jest.fn();
  const nativeProps: { current?: any } = {};

  jest.isolateModules(() => {
    jest.doMock('@selfxyz/mobile-sdk-alpha', () => ({
      useSelfClient: () => ({ extractMRZInfo: mockExtract }),
    }));

    jest.doMock('react-native', () => ({
      __esModule: true,
      PixelRatio: {
        getPixelSizeForLayoutSize: jest.fn(value => value),
      },
      Platform: {
        OS: 'android',
        select: (obj: any) => obj.android || obj.default,
      },
      requireNativeComponent: jest.fn(),
    }));

    jest.doMock('@/specs/PassportOCRViewNativeComponent', () => {
      const MockNativeComponent = jest.fn((props: any) => {
        nativeProps.current = props;
        return null;
      });
      MockNativeComponent.displayName = 'Mock(PassportOCRViewManager)';
      return {
        __esModule: true,
        default: MockNativeComponent,
      };
    });

    const TestRenderer = require('react-test-renderer');
    const { PassportCamera } = require('@/components/native/PassportCamera');
    TestRenderer.act(() => {
      TestRenderer.create(
        <PassportCamera
          isMounted={isMounted}
          onPassportRead={onPassportRead}
        />,
      );
    });
  });

  return { mockExtract, onPassportRead, nativeProps };
}

describe('PassportCamera Android component', () => {
  it('forwards props to the Android Fabric component', () => {
    const { nativeProps } = renderAndroidPassportCamera();

    expect(nativeProps.current).toEqual(
      expect.objectContaining({
        isMounted: true,
        style: expect.objectContaining({
          height: '130%',
          width: '130%',
        }),
      }),
    );
  });

  it('parses string MRZ data through the SDK helper', () => {
    const { mockExtract, onPassportRead, nativeProps } =
      renderAndroidPassportCamera();

    const mrz = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10`;
    const parsed = {
      documentNumber: 'L898902C3',
      validation: { overall: true },
    } as any;
    mockExtract.mockReturnValue(parsed);

    nativeProps.current.onPassportRead({ nativeEvent: { data: mrz } });

    expect(mockExtract).toHaveBeenCalledWith(mrz);
    expect(onPassportRead).toHaveBeenCalledWith(null, parsed);
  });

  it('maps object-form MRZ data directly', () => {
    const { mockExtract, onPassportRead, nativeProps } =
      renderAndroidPassportCamera();

    const obj = {
      documentNumber: '123456789',
      birthDate: '900101',
      expiryDate: '240101',
      countryCode: 'UTO',
      documentType: 'P',
    };

    nativeProps.current.onPassportRead({ nativeEvent: { data: obj } });

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

  it('maps native errors to Error objects', () => {
    const { onPassportRead, nativeProps } = renderAndroidPassportCamera();

    nativeProps.current.onError({
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

  it('ignores native events when unmounted', () => {
    const { mockExtract, onPassportRead, nativeProps } =
      renderAndroidPassportCamera(false);

    nativeProps.current.onPassportRead({
      nativeEvent: {
        data: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10',
      },
    });
    nativeProps.current.onError({
      nativeEvent: {
        error: 'NativeScanError',
        errorMessage: 'scan failed',
        stackTrace: 'stack-trace',
      },
    });

    expect(mockExtract).not.toHaveBeenCalled();
    expect(onPassportRead).not.toHaveBeenCalled();
  });
});
