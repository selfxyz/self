import { triggerFeedback } from '@/utils/haptic/trigger';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Platform, Vibration } from 'react-native';

describe('triggerFeedback', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: originalOS });
  });

  it('uses haptic feedback on iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const vibrateSpy = jest.spyOn(Vibration, 'vibrate');

    triggerFeedback('impactLight');

    expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith(
      'impactMedium',
      expect.any(Object),
    );
    expect(vibrateSpy).not.toHaveBeenCalled();
  });

  it('uses vibration on Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    const vibrateSpy = jest.spyOn(Vibration, 'vibrate');

    triggerFeedback('impactLight');

    expect(vibrateSpy).toHaveBeenCalledWith([50, 100, 50], false);
    expect(ReactNativeHapticFeedback.trigger).not.toHaveBeenCalled();
  });
});

