import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import AccountRecoveryChoiceScreen from '../screens/AccountFlow/AccountRecoveryChoiceScreen';
import AccountRecoveryScreen from '../screens/AccountFlow/AccountRecoveryScreen';
import AccountVerifiedSuccessScreen from '../screens/AccountFlow/AccountVerifiedSuccessScreen';
import RecoverWithPhraseScreen from '../screens/AccountFlow/RecoverWithPhraseScreen';
import SaveRecoveryPhraseScreen from '../screens/AccountFlow/SaveRecoveryPhraseScreen';
import { black, slate300 } from '../utils/colors';

const recoveryScreens = {
  AccountRecovery: {
    screen: AccountRecoveryScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  AccountRecoveryChoice: {
    screen: AccountRecoveryChoiceScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  SaveRecoveryPhrase: {
    screen: SaveRecoveryPhraseScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
  RecoverWithPhrase: {
    screen: RecoverWithPhraseScreen,
    options: {
      headerTintColor: black,
      title: 'Enter Recovery Phrase',
      headerStyle: {
        backgroundColor: black,
      },
      headerTitleStyle: {
        color: slate300,
      },
      headerBackTitle: 'close',
    } as NativeStackNavigationOptions,
  },
  AccountVerifiedSuccess: {
    screen: AccountVerifiedSuccessScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
};

export default recoveryScreens;
